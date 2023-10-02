import * as vscode from "vscode";
import { findMacroEditor, findTargetEditor } from "./editorFinding";
import { TextDecoder, TextEncoder } from "util";
import { getDefaultURI, filePicker } from "./fileUtil";
import { HardError, SoftError, handleErrors, handleErrorsSync } from "./logging";
import { typeAssertRangeArray, typeAssertString } from "./typeAssertions";
import { getOutputChannel } from "./extension";
import { cursed_spinAwait } from "./cursed";

var currentlyRunning: ExecutionContext[] = [];

// TODO:
//  - setFileText
//  - cancelToken

export const runMacroCommandWithFilePicker = async () =>
    handleErrors(async () => {
        const macroEditor = findMacroEditor();
        const macroCode = macroEditor.document.getText();

        const data = await filePicker(getDefaultURI());
        if (!data) {
            throw new SoftError("Nothing was selected");
        }

        const initialText = new TextDecoder().decode(data);

        const newDocument = await vscode.workspace.openTextDocument({
            language: "text",
            content: "",
        });

        const targetEditor = await vscode.window.showTextDocument(newDocument);
        await runMacro(macroCode, targetEditor);

        vscode.window.showInformationMessage(
            "VSCode extensions can't non-destructively edit anything larger than 50mb in size, so the output will go to a new untitled document for now. " +
                "For some reason, if the document is untitled, you can still use the normal Run Macro command on it even though it has the same amount of text. "
        );
    });

export const runMacroCommand = async () =>
    handleErrors(async () => {
        const macroEditor = findMacroEditor();
        const targetEditor = findTargetEditor(macroEditor);
        const macroSource = macroEditor.document.getText();

        await runMacro(macroSource, targetEditor);
    });

export const cancelAllMacrosCommand = async () =>
    handleErrors(async () => {
        cancelAllMacros();
    });

type FileChange = {
    fileUri?: vscode.Uri; // which file in this workspace to change? leaving this as undefined means changing the adjacent/active file
    newText: string; // the text to overwrite this file
};

const ACTIVE_FILE_KEY = "<active>";
class ExecutionContext {
    activeFileKey = ACTIVE_FILE_KEY;
    targetEditor: vscode.TextEditor;
    targetDocument: vscode.TextDocument;

    timerStore = newSleepTimer(this);

    selectedRanges: null | [number, number][] = null;
    changes = new Map<string, FileChange>();
    outputChannel = getOutputChannel();
    cancelSignal = { isCancelled: false };

    setChange(change: FileChange) {
        const uri = change.fileUri;
        const uriString = uri ? uri.scheme + "-" + uri.path : ACTIVE_FILE_KEY;
        this.changes.set(uriString, change);
    }
    async join() {
        await this.timerStore.join();
    }

    constructor(targetEditor: vscode.TextEditor) {
        this.targetEditor = targetEditor;
        this.targetDocument = targetEditor.document;
        this.outputChannel.clear();
    }
}

const newMacroContext = (executionContext: ExecutionContext) => {
    const dontUseTimeoutFunctions = () => {
        // Ironing out the edge cases was too hard :(
        throw new Error(
            "Timeout functions are disabled for now. Use the `async context.sleep(ms: number)` function instead."
        );
    };

    const macroContext = {
        getText: () => getActiveFileText(executionContext),
        setText: (str: any) => setActiveFileText(executionContext, str),
        getSelectedRanges: () => getSelectedRanges(executionContext),
        setSelectedRanges: (rangeList: any) => setSelectedRanges(executionContext, rangeList),

        input: getUserInput,
        exit: macroEarlyExit,
        processRanges: (text: any, ranges: any, processFunc: any) =>
            processRanges(executionContext, text, ranges, processFunc),
        console: {
            log: (...messages: any[]) => logToOutput(executionContext, ...messages),
            error: (...messages: any[]) => errorToOutput(executionContext, ...messages),
            clear: () => clearOutput(executionContext),
        },

        walkWorkspaceFilesTopDown,
        walkWorkspaceFilesBottomUp,
        getFileText: (uri: any) => macroGetFileText(uri),
        setFileText: (uri: any, text: string) => macroSetFileText(executionContext, uri, text), // TODO: test

        applyChangesImmediately: () => applyChangesToActiveFile(executionContext, true),

        sleep: (ms: any) => executionContext.timerStore!.sleep(ms),

        require: require,

        overrides: {
            setTimeout: dontUseTimeoutFunctions,
            setInterval: dontUseTimeoutFunctions,
            clearInterval: dontUseTimeoutFunctions,
            clearTimeout: dontUseTimeoutFunctions,
        },

        cancelSignal: executionContext.cancelSignal,
    };

    return macroContext;
};

const newSleepTimer = (executionContext: ExecutionContext) => {
    const sleepTimer = {
        awaitUntil: Date.now(),
        sleep: (ms: any) => {
            if (typeof ms !== "number") {
                throw new HardError("argument wasn't a number");
            }

            sleepTimer.awaitUntil = Date.now() + ms;
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve(undefined);
                }, ms);
            });
        },
        join: () =>
            new Promise((resolve) => {
                const interval = setInterval(() => {
                    if (
                        executionContext.cancelSignal.isCancelled ||
                        sleepTimer.awaitUntil < Date.now()
                    ) {
                        clearInterval(interval);
                        resolve(undefined);
                    }
                }, 500);
            }),
    };

    return sleepTimer;
};

export const runMacro = async (code: string, targetEditor: vscode.TextEditor) => {
    const executionContext = new ExecutionContext(targetEditor);
    currentlyRunning.push(executionContext);

    try {
        // run the macro

        const macroContext = newMacroContext(executionContext);
        const overrideNames = Object.keys(macroContext.overrides);

        const macroSource = `"use strict";
    return (async (context, overrides) => {
        const { ${overrideNames.join(", ")} } = overrides;\n
        ${code}\n
    });`;
        const macroFunction = Function(macroSource)();
        await macroFunction(macroContext, macroContext.overrides);

        await executionContext.join();

        // ---- apply execution result

        let workspaceEdit: vscode.WorkspaceEdit | null = null;

        let promises: Thenable<any>[] = [];

        for (const [fileURIKey, change] of executionContext.changes.entries()) {
            if (fileURIKey === executionContext.activeFileKey) {
                // apply changes to the active file
                const promise = applyChangesToActiveFile(executionContext, false);
                promises.push(promise);
                continue;
            }

            const uri = change.fileUri;
            if (!uri) {
                // this should not be possible, and is a bug. fileUri should only be undefined if fileURI === executionContext.activeFileKey
                // which is handled above
                continue;
            }

            if (!workspaceEdit) {
                workspaceEdit = new vscode.WorkspaceEdit();
            }

            // apply changes to a file somewhere in the workspace
            workspaceEdit.replace(
                uri,
                new vscode.Range(new vscode.Position(0, 0), new vscode.Position(2147483648, 0)),
                change.newText
            );
        }

        if (workspaceEdit) {
            const workspaceEditApplyPromise = vscode.workspace.applyEdit(workspaceEdit);
            promises.push(workspaceEditApplyPromise);
        }

        await Promise.all(promises);
    } catch (err) {
        throw err;
    } finally {
        // TODO: check if race condition
        currentlyRunning.splice(currentlyRunning.indexOf(executionContext), 1);
    }
};

const cancelAllMacros = () => {
    for (let i = 0; i < currentlyRunning.length; i++) {
        currentlyRunning[i].cancelSignal.isCancelled = true;
    }

    currentlyRunning.splice(0, currentlyRunning.length);
};

const getUserInput = async (promptTextAny: any): Promise<string | undefined> => {
    let promptText = typeAssertString(promptTextAny);

    const res = await vscode.window.showInputBox({
        title: "Macro input",
        prompt: promptText,
    });

    if (!res) {
        return undefined;
    }

    return res;
};

const macroEarlyExit = (reasonAny: any) => {
    let reason = typeAssertString(reasonAny);
    if (!reason) {
        reason = "macro exited early";
    }

    throw new SoftError(reason);
};

const processRanges = (
    executionContext: ExecutionContext,
    textAny: any,
    rangeArrayAny: any,
    processFunc: (input: string) => string
) => {
    let text = typeAssertString(textAny);
    let rangeArray = typeAssertRangeArray(rangeArrayAny);

    // ensure ranges don't overalp
    rangeArray.sort((a, b) => a[0] - b[0]);
    for (let i = 0; i < rangeArray.length - 1; i++) {
        if (rangeArray[i][1] >= rangeArray[i + 1][0]) {
            // range i's end is overstepping range i+1's start
            throw new Error(
                `rangeArray[${i}][1] (${rangeArray[i][1]}) was greater than rangeArray[i + 1][0] (${
                    rangeArray[i + 1][0]
                })`
            );
        }
    }

    // this stringBuilder is being filled like [0 to range 1],([range 1 processed],[range 1 end to next range start])*
    const stringBuilder = Array<string>(rangeArray.length * 2 + 1);
    stringBuilder[0] = text.substring(0, rangeArray[0][0]);

    for (let i = 0; i < rangeArray.length; i++) {
        const range = rangeArray[i];
        const rangeText = text.substring(range[0], range[1]);
        const processedAny = processFunc(rangeText);
        const processed = typeAssertString(processedAny);

        const index = 1 + i * 2;
        stringBuilder[index] = processed;

        if (i !== rangeArray.length - 1) {
            stringBuilder[index + 1] = text.substring(range[1], rangeArray[i + 1][0]);
        } else {
            stringBuilder[index + 1] = text.substring(range[1]);
        }
    }

    // update the ranges in-place based on the lengths of the string-builder entries
    let currentPos = stringBuilder[0].length;
    for (let i = 0; i < rangeArray.length; i++) {
        const index = 1 + i * 2;
        rangeArray[i][0] = currentPos;

        // TODO: if we are processing ranges in a non-adjacent file, then this is wrong.
        // Should just increment by normal length, then adjust for the real length when applying the chanes at the end
        currentPos += realLength(stringBuilder[index], executionContext.targetDocument.eol);
        rangeArray[i][1] = currentPos;

        // TODO: same here
        currentPos += realLength(stringBuilder[index + 1], executionContext.targetDocument.eol);
    }

    return stringBuilder.join("");
};

/** realLength gets the real string length taking CLRF into account  */
const realLength = (str: string, eol: vscode.EndOfLine): number => {
    let len = 0;

    if (eol === vscode.EndOfLine.LF) {
        // LF
        for (let i = 0; i < str.length; i++) {
            if (str[i] === "\r") {
                continue;
            }

            len++;
        }

        return len;
    } else {
        // CLRF
        for (let i = 0; i < str.length; i++) {
            if (str[i] === "\n" && str[i - 1] !== "\r") {
                len++;
            }

            len++;
        }

        return len;
    }
};

const getActiveFileText = (executionContext: ExecutionContext) => {
    const { changes, activeFileKey, targetDocument } = executionContext;

    const activeFileChange = changes.get(activeFileKey);
    if (activeFileChange) {
        return activeFileChange.newText;
    }

    return targetDocument.getText() || "";
};

const setActiveFileText = (executionContext: ExecutionContext, textAny: any) => {
    const text = typeAssertString(textAny);

    executionContext.setChange({
        fileUri: undefined,
        newText: text,
    });
};

type RangeList = [number, number][];

const getSelectedRanges = (executionContext: ExecutionContext): null | RangeList => {
    const { targetEditor } = executionContext;

    if (targetEditor.selections.length === 0) {
        return null;
    }

    return targetEditor.selections.map((s) => [
        targetEditor.document.offsetAt(s.start),
        targetEditor.document.offsetAt(s.end),
    ]);
};

// type-assert that newRanges is [int, int][] before setting selectedRanges
const setSelectedRanges = (executionContext: ExecutionContext, newRanges: any) => {
    executionContext.selectedRanges = typeAssertRangeArray(newRanges);
};

const toLogObjectString = (obj: any) => {
    if (typeof obj === "string") {
        return obj;
    }

    // TODO: implement %v style printing, so it works on most objects
    if (obj) {
        const str = obj.toString();
        if (typeof str === "string" && str !== "[object Object]") {
            return str;
        }
    }

    try {
        return JSON.stringify(obj);
    } catch {
        return "<couldn't stringify this object>";
    }
};

const applyChangesToActiveFile = async (executionContext: ExecutionContext, isMidRun: boolean) => {
    const { changes, targetEditor, activeFileKey } = executionContext;
    const targetDocument = targetEditor.document;

    const val = executionContext.changes.get(activeFileKey);
    if (!val) {
        return;
    }

    // Ensure the editor has focus when we are updating it.
    // Otherwise, the edit function throws an error.
    await vscode.window.showTextDocument(targetDocument, targetEditor.viewColumn, true);

    await targetEditor.edit(
        (edit) => {
            const entireDocumentRange = new vscode.Range(
                new vscode.Position(0, 0),
                targetDocument.positionAt(targetDocument.getText().length)
            );

            edit.replace(entireDocumentRange, val.newText);
        },
        {
            undoStopAfter: true,
            undoStopBefore: true,
        }
    );

    if (!isMidRun && !!executionContext.selectedRanges) {
        // apply new cursor positions/highlights
        const selectedRangesToVscodeRanges = executionContext.selectedRanges.map(
            (range) =>
                new vscode.Selection(
                    targetDocument.positionAt(range[0]),
                    targetDocument.positionAt(range[1])
                )
        );

        targetEditor.selections = selectedRangesToVscodeRanges;
    }
};

type FileProcessFunc = (filepath: vscode.Uri) => Promise<any>;

const walkWorkspaceFilesTopDown = async (processFunc: FileProcessFunc): Promise<any> => {
    return walkFilesInternal(processFunc, false);
};

const walkWorkspaceFilesBottomUp = async (processFunc: FileProcessFunc): Promise<any> => {
    return walkFilesInternal(processFunc, true);
};

const walkFilesInternal = async (processFunc: FileProcessFunc, bottomUp: boolean): Promise<any> => {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        throw new HardError("No workspace folders are currently open.");
    }

    const folders = workspaceFolders.map((f) => f.uri);

    const walkFilesFunc = bottomUp ? walkFilesBottomUpInternal : walkFilesTopDownInternal;
    for (const folder of folders) {
        const res = await walkFilesFunc(folder, processFunc);
        if (res) {
            return res;
        }
    }
};

const walkFilesTopDownInternal = async (
    rootFolder: vscode.Uri,
    processFunc: FileProcessFunc
): Promise<any> => {
    let folders: vscode.Uri[] = [rootFolder];
    let nextFolders: vscode.Uri[] = [];

    while (folders.length > 0) {
        // process all folders
        while (folders.length > 0) {
            const folder = folders.pop();
            if (!folder) continue;

            const folderEntries = await vscode.workspace.fs.readDirectory(folder);
            for (const [name, type] of folderEntries) {
                const uri = vscode.Uri.joinPath(folder, name);

                if (type === vscode.FileType.Directory || type === vscode.FileType.SymbolicLink) {
                    nextFolders.push(uri);
                } else if (type === vscode.FileType.File) {
                    const res = await processFunc(uri);
                    if (res) {
                        return res;
                    }
                }
            }
        }

        // set folders to nextFolders
        const temp = folders;
        folders = nextFolders;
        nextFolders = temp;
    }
};

const walkFilesBottomUpInternal = async (
    folder: vscode.Uri,
    processFunc: FileProcessFunc
): Promise<any> => {
    const folderEntries = await vscode.workspace.fs.readDirectory(folder);

    // recurse into folders
    for (const [name, type] of folderEntries) {
        if (type !== vscode.FileType.Directory && type !== vscode.FileType.SymbolicLink) {
            continue;
        }

        const uri = vscode.Uri.joinPath(folder, name);
        const res = await walkFilesBottomUpInternal(uri, processFunc);
        if (res) {
            return res;
        }
    }

    // process files
    for (const [name, type] of folderEntries) {
        if (type !== vscode.FileType.File) {
            continue;
        }

        const uri = vscode.Uri.joinPath(folder, name);
        const res = await processFunc(uri);
        if (res) {
            return res;
        }
    }
};

const toUri = (uri: any) => {
    if (typeof uri === "string") {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            uri = vscode.Uri.joinPath(workspaceFolders[0].uri, uri);
        } else {
            uri = vscode.Uri.file(uri);
        }
    }

    if (!(uri instanceof vscode.Uri)) {
        throw new HardError(
            "uri must be of type vscode.Uri or string (which will just be converted to a relative uri or a global uri if not in a workspace)"
        );
    }

    return uri;
};

const macroGetFileText = async (uri: any): Promise<string> => {
    uri = toUri(uri);
    const bytes = await vscode.workspace.fs.readFile(uri);
    const str = new TextDecoder().decode(bytes);
    return str;
};

const macroSetFileText = (executionContext: ExecutionContext, uri: any, newText: any) => {
    newText = typeAssertString(newText);
    uri = toUri(uri);

    executionContext.setChange({
        newText: newText,
        fileUri: uri,
    });
};

const logToOutput = (executionContext: ExecutionContext, ...messages: any[]) => {
    const { outputChannel } = executionContext;
    outputChannel.append(messages.map(toLogObjectString).join(" "));
    outputChannel.append("\n");
    outputChannel.show(true);
};

const errorToOutput = (executionContext: ExecutionContext, ...messages: any[]) => {
    const { outputChannel } = executionContext;

    // I don't know how to make it red yet.
    // The API doc says something about LogOutputChannel, but I can't access that for some reason.
    // Maybe I need to update the packages? TODO: figure this out
    outputChannel.append("ERROR: ");
    outputChannel.append(messages.map(toLogObjectString).join(" "));
    outputChannel.append("\n");

    outputChannel.show(true);
};

function clearOutput(executionContext: ExecutionContext) {
    executionContext.outputChannel.clear();
}
