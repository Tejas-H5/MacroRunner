import * as vscode from "vscode";
import macroTemplate from "./macroTemplate";
import { runMacroCommand } from "./runMacroCommand";

const newMacroCommand = async () => {
    let document = await vscode.workspace.openTextDocument({
        content: macroTemplate,
        language: "javascript",
    });

    let visibleEditors = vscode.window.visibleTextEditors;
    await vscode.window.showTextDocument(
        document,
        visibleEditors.length === 1 ? vscode.ViewColumn.Beside : vscode.ViewColumn.Active
    );
};

export function activate(context: vscode.ExtensionContext) {
    console.log("Macro runner extension is now active!");

    context.subscriptions.push(
        vscode.commands.registerCommand("macrorunner.newMacro", newMacroCommand)
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("macrorunner.runMacro", runMacroCommand)
    );
}

export function deactivate() {}
