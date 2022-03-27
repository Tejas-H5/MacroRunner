import * as vscode from "vscode";
import {
    loadMacroCommand,
    saveMacroCommand,
    removeMacroCommand,
    newMacroCommand,
} from "./macroStorage";
import { runMacroCommand } from "./runMacroCommand";

export var macrosUri: vscode.Uri | null = null;

export function activate(context: vscode.ExtensionContext) {
    console.log("Macro runner extension is now active!");

    const storagePath = context.globalStorageUri;
    macrosUri = vscode.Uri.joinPath(storagePath, "macros");

    context.subscriptions.push(
        vscode.commands.registerCommand("macrorunner.newMacro", newMacroCommand),
        vscode.commands.registerCommand("macrorunner.runMacro", runMacroCommand),
        vscode.commands.registerCommand("macrorunner.loadMacro", loadMacroCommand),
        vscode.commands.registerCommand("macrorunner.saveMacro", saveMacroCommand),
        vscode.commands.registerCommand("macrorunner.removeMacro", removeMacroCommand)
    );
}

export function deactivate() {}
