import * as vscode from "vscode";

export const getAvailableEditors = () => {
    let visibleEditors = vscode.window.visibleTextEditors;
    visibleEditors = visibleEditors.filter((editor) => {
        return !["output"].includes(editor.document.uri.scheme);
    });

    return visibleEditors;
};

export const getEditorWithMacroFile = () => {
    let visibleEditors = getAvailableEditors();

    let macroEditors = visibleEditors.filter((editor) => {
        const code = editor.document.getText();
        const containsSafetyCatch = code.startsWith("// macro");

        return containsSafetyCatch;
    });

    if (macroEditors.length === 0) {
        throw new Error(
            "Make sure your macro starts with '// macro' (this is a safety catch), or that you have the right file visible"
        );
    }

    if (macroEditors.length > 1) {
        throw new Error(
            "Found multiple macros, make sure that only the macro you want to run is visible."
        );
    }

    // sometimes copy-pasted macro code can resolve to c/c++
    if (macroEditors[0].document.languageId !== "javascript") {
        vscode.languages.setTextDocumentLanguage(macroEditors[0].document, "javascript");
    }

    return macroEditors[0];
};

export const getEditorWithTargetFile = (macroEditor: vscode.TextEditor) => {
    let editor = vscode.window.activeTextEditor;
    if (editor && editor !== macroEditor) return editor;

    let visibleEditors = getAvailableEditors();
    if (visibleEditors.length === 2 || editor === undefined) {
        return visibleEditors[0] === macroEditor ? visibleEditors[1] : visibleEditors[0];
    } else if (visibleEditors.length > 2) {
        throw new Error(
            "When you have more than two other editors open, bring focus to the one you want to run the macro in"
        );
    } else {
        throw new Error(
            "You need the macro editor and the target document side-by-side. Also, this doesn't work for files larger than 50mb"
        );
    }
};
