import * as vscode from "vscode";
import { findMacroEditor, findTargetEditor } from "./editorFinding";
import { TextDecoder, TextEncoder } from "util";
import { getDefaultURI, filePicker } from "./fileUtil";
import { HardError, SoftError, handleErrors, handleErrorsSync } from "./logging";
import { typeAssertRangeArray, typeAssertString } from "./typeAssertions";
import { cursed_spinAwait } from "./cursed";

export const runMacroCommandWithFilePicker = async () => {
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
};

export const runMacroCommand = async () => {
    handleErrors(async () => {
        const macroEditor = findMacroEditor();
        const targetEditor = findTargetEditor(macroEditor);
        const macroSource = macroEditor.document.getText();

        await runMacro(macroSource, targetEditor);
    });
};

type FileChange = {
    fileUri?: vscode.Uri; // which file in this workspace to change? leaving this as undefined means changing the adjacent/active file
    newText: string; // the text to overwrite this file
};

const newExecutionContext = (targetEditor: vscode.TextEditor): ExecutionContext => {
    // TODO: just make this the actual URI of the active file
    const activeFileKey = "<active>";

    const executionContext = {
        selectedRanges: null,
        changes: new Map<string, FileChange>(),
        setChange: (change: FileChange) => {
            const uri = change.fileUri;
            const uriString = uri ? uri.scheme + "-" + uri.path : executionContext.activeFileKey;
            executionContext.changes.set(uriString, change);
        },
        targetEditor,
        targetDocument: targetEditor.document,
        outputChannel: vscode.window.createOutputChannel("Macro Runner Output"),
        activeFileKey,
    };

    return executionContext;
};

type ExecutionContext = {
    selectedRanges: null | [number, number][];
    changes: Map<string, FileChange>;
    setChange: (change: FileChange) => void;
    targetDocument: vscode.TextDocument;
    targetEditor: vscode.TextEditor;
    outputChannel: vscode.OutputChannel;
    activeFileKey: string;
};

export const runMacro = async (code: string, targetEditor: vscode.TextEditor) => {
    const [timerStore, setTimeout, clearTimeout, setInterval, clearInterval] =
        createIntervalTimeoutFunctions();

    const executionContext = newExecutionContext(targetEditor);

    // ---- create macro context

    const macroContext = {
        getText: () => getActiveFileText(executionContext),
        setText: (str: any) => setActiveFileText(executionContext, str),
        getSelectedRanges: () => getSelectedRanges(executionContext),
        setSelectedRanges: (rangeList: any) => setSelectedRanges(executionContext, rangeList),

        input: getUserInput,
        exit: macroEarlyExit,
        processRanges: processRanges,

        walkWorkspaceFilesTopDown,
        walkWorkspaceFilesBottomUp,
        getFileText: macroGetFileText,
        setFileText: macroSetFileText,

        console: {
            log: (...messages: any[]) => logToOutput(executionContext, ...messages),
            error: (...messages: any[]) => errorToOutput(executionContext, ...messages),
        },

        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        applyChangesImmediately: () => applyChangesToActiveFile(executionContext, true),

        require: require,
    };

    // ---- run the macro

    const macroSource = `"use strict";return (async (context) => {\n${code}\n});`;
    const macroFunction = Function(macroSource)();
    await macroFunction(macroContext);

    // wait for all timeouts to end
    await timerStore.joinAll();

    // ---- apply execution result

    for (const [fileURI, change] of executionContext.changes.entries()) {
        if (fileURI === executionContext.activeFileKey) {
            // apply changes to the active file
            applyChangesToActiveFile(executionContext, false);
            return;
        }

        // TODO: apply changes to arbitrary files in the workspace
    }
};

const [setIntervalReal, clearIntervalReal, setTimeoutReal, clearTimeoutReal] = [
    setInterval,
    clearInterval,
    setTimeout,
    clearTimeout,
];

const newTimerStore = () => {
    const timerStore = {
        timeouts: new Map<NodeJS.Timeout, number>(),
        // each timer stores when it will end, so that we can await it
        setTime: (id: NodeJS.Timeout, millisecondsFromNow: number) => {
            if (millisecondsFromNow === 0) {
                timerStore.timeouts.delete(id);
                return;
            }

            timerStore.timeouts.set(id, Date.now() + millisecondsFromNow);
        },
        joinAll: () => {
            return new Promise<void>((resolve) => {
                const values = timerStore.timeouts.values();
                let waitUntil = 0;
                for (const ms of values) {
                    if (ms > waitUntil) {
                        waitUntil = ms;
                    }
                }

                const msToWait = waitUntil - Date.now() + 50; // + 50 for good luck
                if (msToWait <= 0) {
                    return resolve();
                }

                setTimeoutReal(() => {
                    resolve();
                }, msToWait);
            });
        },
    };

    return timerStore;
};

export type TimerStore = ReturnType<typeof newTimerStore>;

const createIntervalTimeoutFunctions = () => {
    const timerStore = newTimerStore();

    const setInterval = (callback: (...args: any[]) => void, milliseconds?: number) => {
        const timeout = setIntervalReal(() => {
            handleErrorsSync(callback);
            timerStore.setTime(timeout, milliseconds || 0);
        }, milliseconds);

        timerStore.setTime(timeout, milliseconds || 0);

        return timeout;
    };

    const setTimeout = (callback: (...args: any[]) => void, milliseconds?: number) => {
        const timeout = setTimeoutReal(() => handleErrorsSync(callback), milliseconds);
        timerStore.setTime(timeout, milliseconds || 0);

        return timeout;
    };

    const clearInterval = (timeoutID: NodeJS.Timeout) => {
        clearIntervalReal(timeoutID);
        timerStore.timeouts.set(timeoutID, 0);
    };

    const clearTimeout = (timeoutID: NodeJS.Timeout) => {
        clearTimeoutReal(timeoutID);
        timerStore.timeouts.set(timeoutID, 0);
    };

    return [timerStore, setTimeout, clearTimeout, setInterval, clearInterval] as const;
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

        if (i != rangeArray.length - 1) {
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

        currentPos += stringBuilder[index].length;
        rangeArray[i][1] = currentPos;

        currentPos += stringBuilder[index + 1].length;
    }

    return stringBuilder.join("");
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

    if (targetEditor.selections.length == 0) {
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

type FileProcessFunc = (filepath: vscode.Uri) => any;

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

const typeAssertUri = (uri: any) => {
    if (typeof uri === "string") {
        uri = vscode.Uri.file(uri);
    }

    if (!(uri instanceof vscode.Uri)) {
        throw new HardError(
            "uri must be of type vscode.Uri or string (which will just be converted to a uri with vscode.Uri.file)"
        );
    }

    return uri;
};

const macroGetFileText = async (uri: any) => {
    uri = typeAssertUri(uri);
    return getFileText(uri);
};

const getFileText = async (uri: vscode.Uri): Promise<string> => {
    const bytes = await vscode.workspace.fs.readFile(uri);
    const str = new TextDecoder().decode(bytes);
    return str;
};

const macroSetFileText = async (executionContext: ExecutionContext, uri: any, newText: any) => {
    newText = typeAssertString(newText);
    uri = typeAssertUri(uri);

    executionContext.changes;
};

const logToOutput = (executionContext: ExecutionContext, ...messages: any[]) => {
    const { outputChannel } = executionContext;
    outputChannel.append(messages.map(toLogObjectString).join(" "));
    outputChannel.append("\n");
};
const errorToOutput = (executionContext: ExecutionContext, ...messages: any[]) => {
    const { outputChannel } = executionContext;

    // I don't know how to make it red yet.
    // The API doc says something about LogOutputChannel, but I can't access that for some reason.
    // Maybe I need to update the packages? TODO: figure this out
    outputChannel.append("ERROR: ");
    outputChannel.append(messages.map(toLogObjectString).join(" "));
    outputChannel.append("\n");
};
