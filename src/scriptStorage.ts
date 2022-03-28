import { TextEncoder } from "util";
import * as vscode from "vscode";
import { scriptsUri } from "./extension";
import { replaceAll } from "./textEditorUtil";
import { getEditorWithScriptFile } from "./runScriptCommand";

const ensureScriptsDir = async () => {
    if (scriptsUri === null) {
        throw new Error("Scripts directory is unknown");
    }

    await vscode.workspace.fs.createDirectory(scriptsUri);
    return scriptsUri;
};

export const openScriptsDir = async () => {
    const dir = await ensureScriptsDir();
    vscode.commands.executeCommand("revealFileInOS", dir);
};

const getSavedScripts = async () => {
    const dir = await ensureScriptsDir();
    const dirContents = await vscode.workspace.fs.readDirectory(dir);

    const files = dirContents.filter((c) => c[1] === vscode.FileType.File).map((c) => c[0]);
    return files;
};

const pickExistingScript = async (inputTitle: string) => {
    const savedScriptsNamed = await getSavedScripts();
    if (savedScriptsNamed.length === 0) {
        vscode.window.showInformationMessage(
            "You haven't saved any scripts with the Save Script command yet"
        );
        return;
    }

    const input = await vscode.window.showQuickPick(savedScriptsNamed, {
        title: inputTitle,
        matchOnDescription: true,
        matchOnDetail: true,
    });

    return input;
};

export const saveScriptCommand = async () => {
    const dir = scriptsUri;
    if (dir === null) {
        throw new Error("Scripts directory is unknown");
    }

    try {
        const scriptEditor = getEditorWithScriptFile();
        const scriptEditorDocument = scriptEditor.document;

        const input = await vscode.window.showInputBox({
            title: "Name this script:",
        });

        if (input === undefined) return;
        let fileName = input;
        if (!fileName.toLowerCase().endsWith(".js")) {
            fileName += ".js";
        }

        // no clean way to save-as, so we are going to write a new file,
        // close the existing one, then load the file we just wrote
        const text = scriptEditorDocument.getText();
        const filepath = vscode.Uri.joinPath(dir, fileName);
        const enc = new TextEncoder();

        await vscode.workspace.fs.writeFile(filepath, enc.encode(text));

        await vscode.window
            .showTextDocument(scriptEditorDocument, scriptEditor.viewColumn)
            .then(async (editor) => {
                if (scriptEditorDocument.isUntitled) {
                    // no clean way to close an untitled document, so we are just going to
                    // replace with nothing so that we don't get the option to save the document
                    await replaceAll("", editor.document, editor.viewColumn, false).then(() => {
                        vscode.commands.executeCommand("workbench.action.closeActiveEditor");
                    });
                }

                await loadScript(fileName);
            });
    } catch (err: any) {
        vscode.window.showErrorMessage(err.message);
    }
};

const loadScript = async (input: string) => {
    const dir = scriptsUri;
    if (dir === null) return;

    try {
        const document = await vscode.workspace.openTextDocument(vscode.Uri.joinPath(dir, input));
        await showDocument(document);
        vscode.window.showInformationMessage("Loaded " + input);
    } catch (err: any) {
        vscode.window.showErrorMessage(err.message);
    }
};

export const loadScriptCommand = async () => {
    const input = await pickExistingScript("pick a script to load");
    if (input === undefined) return;

    await loadScript(input);
};

export const removeScriptCommand = async () => {
    const input = await pickExistingScript("pick a script to load");
    if (input === undefined) return;

    const dir = scriptsUri;
    if (dir === null) return;

    try {
        const answer = await vscode.window.showWarningMessage(
            "Are you sure you want to delete the script " + input + " ?",
            {
                modal: true,
                detail: "It will be moved to the recycle bin if possible. What's the deal with the recycle bin anyway? what exactly are we recycling?",
            },
            "Yes",
            "No"
        );

        if (answer !== "Yes") {
            return;
        }

        await vscode.workspace.fs.delete(vscode.Uri.joinPath(dir, input), {
            useTrash: true,
        });

        vscode.window.showInformationMessage("Deleted " + input);
    } catch (err: any) {
        vscode.window.showErrorMessage(err.message);
    }
};

const defaultScript = `// script 
// read documentation for injected objects like 'file', 'context', etc on the extension page

const file = context.getFile();
let text = "" + file.text;  // a hacky way to get autocomplete

#cursor

file.setText(text);
`;

const showDocument = async (
    document: vscode.TextDocument,
    cursorIndex: number | undefined = undefined
) => {
    let visibleEditors = vscode.window.visibleTextEditors;
    await vscode.window
        .showTextDocument(
            document,
            visibleEditors.length === 1 ? vscode.ViewColumn.Beside : vscode.ViewColumn.Active
        )
        .then((editor) => {
            if (cursorIndex === undefined) {
                cursorIndex = editor.document.getText().length - 1;
            }

            editor.selection = new vscode.Selection(
                editor.document.positionAt(cursorIndex),
                editor.document.positionAt(cursorIndex)
            );
        });
};

export const newScriptCommand = async () => {
    let text = defaultScript;
    let selIndex = text.indexOf("#cursor");
    if (selIndex === -1) {
        selIndex = text.length - 1;
    } else {
        text = text.replace("#cursor", "");
    }

    let document = await vscode.workspace.openTextDocument({
        content: text,
        language: "javascript",
    });

    showDocument(document, selIndex);
};
