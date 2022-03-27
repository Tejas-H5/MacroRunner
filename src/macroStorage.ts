import { TextEncoder } from "util";
import * as vscode from "vscode";
import { macrosUri } from "./extension";
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
        const macroEditorDocument = getEditorWithMacroFile().document;

        const input = await vscode.window.showInputBox({
            title: "Name this macro:",
        });

        if (input === undefined) return;
        let fileName = input;
        if (!fileName.toLowerCase().endsWith(".js")) {
            fileName += ".js";
        }

        const text = macroEditorDocument.getText();
        const filepath = vscode.Uri.joinPath(dir, fileName);
        const enc = new TextEncoder();
        vscode.workspace.fs.writeFile(filepath, enc.encode(text));
    } catch (err: any) {
        vscode.window.showErrorMessage(err.message);
    }
};

export const loadMacroCommand = async () => {
    const input = await pickExistingMacro("pick a macro to load");
    if (input === undefined) return;

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
// Find documentation about the injected objects here: https://github.com/El-Tejaso/macrorunner

const file = context.getFile();
let text = \`\${file.getText()}\`; // autocomplete purposes. I don't know how to inject autocomplete just yet

// Make your modifications here


file.setText(text);
debug.info("macro completed");
`;

const showDocument = async (document: vscode.TextDocument) => {
    let visibleEditors = vscode.window.visibleTextEditors;
    await vscode.window.showTextDocument(
        document,
        visibleEditors.length === 1 ? vscode.ViewColumn.Beside : vscode.ViewColumn.Active
    );
};

export const newMacroCommand = async () => {
    let document = await vscode.workspace.openTextDocument({
        content: defaultMacro,
        language: "javascript",
    });

    await showDocument(document);
};
