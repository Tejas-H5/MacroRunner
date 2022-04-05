import * as vscode from "vscode";
import {
    loadMacroCommand,
    saveMacroCommand,
    removeMacroCommand,
    newMacroCommand,
    openMacrosDir,
} from "./macroStorage";
import { runMacroCommand, runMacroCommandWithFilePicker } from "./runMacroCommand";

export var macrosUri: vscode.Uri | null = null;

export function activate(context: vscode.ExtensionContext) {
    console.log("MacroRunner extension is now active!");

    const storagePath = context.globalStorageUri;
    macrosUri = vscode.Uri.joinPath(storagePath, "macros");

    context.subscriptions.push(
        vscode.commands.registerCommand("MacroRunner.runMacro", async () => {
            vscode.window.withProgress(
                { location: vscode.ProgressLocation.Window, title: "macro running..." },
                runMacroCommand
            );
        }),
        vscode.commands.registerCommand("MacroRunner.runMacroLF", async () => {
            vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Window,
                    title: "(Large File) macro running...",
                },
                runMacroCommandWithFilePicker
            );
        }),

        vscode.commands.registerCommand("MacroRunner.newMacro", newMacroCommand),
        vscode.commands.registerCommand("MacroRunner.loadMacro", loadMacroCommand),
        vscode.commands.registerCommand("MacroRunner.saveMacro", saveMacroCommand),
        vscode.commands.registerCommand("MacroRunner.removeMacro", removeMacroCommand),
        vscode.commands.registerCommand("MacroRunner.openMacrosDirectory", openMacrosDir)
    );
}

export function deactivate() {}
