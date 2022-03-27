import { TextEncoder } from "util";
import * as vscode from "vscode";
import { macrosUri } from "./extension";
import { replaceAll } from "./macroUtil";
import { getEditorWithMacroFile } from "./runMacroCommand";

const ensureMacrosDir = async () => {
    if (macrosUri === null) {
        throw new Error("Macros directory is unknown");
    }

    await vscode.workspace.fs.createDirectory(macrosUri);
    return macrosUri;
};

const getSavedMacros = async () => {
    const dir = await ensureMacrosDir();
    const dirContents = await vscode.workspace.fs.readDirectory(dir);

    const files = dirContents.filter((c) => c[1] === vscode.FileType.File).map((c) => c[0]);
    return files;
};

const pickExistingMacro = async (inputTitle: string) => {
    const savedMacrosNamed = await getSavedMacros();
    if (savedMacrosNamed.length === 0) {
        vscode.window.showInformationMessage(
            "You haven't saved any macros with the Save Macro command yet"
        );
        return;
    }

    const input = await vscode.window.showQuickPick(savedMacrosNamed, {
        title: inputTitle,
        matchOnDescription: true,
        matchOnDetail: true,
    });

    return input;
};

export const saveMacroCommand = async () => {
    const dir = macrosUri;
    if (dir === null) {
        throw new Error("Macros directory is unknown");
    }

    try {
        const macroEditor = getEditorWithMacroFile();
        const macroEditorDocument = macroEditor.document;

        const input = await vscode.window.showInputBox({
            title: "Name this macro:",
        });

        if (input === undefined) return;
        let fileName = input;
        if (!fileName.toLowerCase().endsWith(".js")) {
            fileName += ".js";
        }

        // no clean way to save-as, so we are going to write a new file,
        // close the existing one, then load the file we just wrote
        const text = macroEditorDocument.getText();
        const filepath = vscode.Uri.joinPath(dir, fileName);
        const enc = new TextEncoder();

        await vscode.workspace.fs.writeFile(filepath, enc.encode(text));

        await vscode.window
            .showTextDocument(macroEditorDocument, macroEditor.viewColumn)
            .then(async (editor) => {
                if (macroEditorDocument.isUntitled) {
                    // no clean way to close an untitled document, so we are just going to
                    // replace with nothing so that we don't get the option to save the document
                    await replaceAll("", editor.document, editor.viewColumn, false).then(() => {
                        vscode.commands.executeCommand("workbench.action.closeActiveEditor");
                    });
                }

                await loadMacro(fileName);
            });
    } catch (err: any) {
        vscode.window.showErrorMessage(err.message);
    }
};

const loadMacro = async (input: string) => {
    const dir = macrosUri;
    if (dir === null) return;

    try {
        const document = await vscode.workspace.openTextDocument(vscode.Uri.joinPath(dir, input));
        await showDocument(document);
        vscode.window.showInformationMessage("Loaded " + input);
    } catch (err: any) {
        vscode.window.showErrorMessage(err.message);
    }
};

export const loadMacroCommand = async () => {
    const input = await pickExistingMacro("pick a macro to load");
    if (input === undefined) return;

    await loadMacro(input);
};

export const removeMacroCommand = async () => {
    const input = await pickExistingMacro("pick a macro to load");
    if (input === undefined) return;

    const dir = macrosUri;
    if (dir === null) return;

    try {
        const answer = await vscode.window.showWarningMessage(
            "Are you sure you want to delete the macro " + input + " ?",
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

const defaultMacro = `// macro 
// read documentation for injected objects like 'file', 'context', etc on the extension page

const file = context.getFile();
let text = "" + file.getText();  // a hacky way to get autocomplete

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

export const newMacroCommand = async () => {
    let text = defaultMacro;
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
