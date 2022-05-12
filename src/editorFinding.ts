import * as vscode from "vscode";

export const findAvailableEditors = () => {
    let visibleEditors = vscode.window.visibleTextEditors;
    visibleEditors = visibleEditors.filter((editor) => {
        return !["output"].includes(editor.document.uri.scheme);
    });

    return visibleEditors;
};

export const findMacroEditor = () => {
    let visibleEditors = findAvailableEditors();

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

export const findTargetEditor = (
    macroEditor: vscode.TextEditor | undefined = undefined
): vscode.TextEditor => {
    let activeEditor = vscode.window.activeTextEditor;

    let visibleEditors = findAvailableEditors();

    if (macroEditor === undefined) {
        if (activeEditor) {
            return activeEditor;
        }

        if (visibleEditors.length > 1) {
            throw new Error(
                "When you have more than one editor open, bring focus to the one you want to run the macro in"
            );
        }

        if (visibleEditors.length === 1) {
            return visibleEditors[0];
        }
    } else {
        if (activeEditor && activeEditor !== macroEditor) {
            return activeEditor;
        }

        if (visibleEditors.length > 2) {
            throw new Error(
                "When you have more than two editors open, bring focus to the one you want to run the macro in"
            );
        }

        if (visibleEditors.length === 2) {
            return visibleEditors[0] === macroEditor ? visibleEditors[1] : visibleEditors[0];
        }
    }

    throw new Error(
        `The macro file and the target file must both be visible.
Also, this doesn't work for files larger than 50mb, use the command 'Run Macro (for large files > 50mb)'`
    );
};
