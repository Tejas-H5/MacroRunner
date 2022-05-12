import * as vscode from "vscode";
import {
    loadMacroCommand,
    saveMacroCommand,
    removeMacroCommand,
    newMacroCommand,
    openMacrosDir,
    runSavedMacroCommand,
} from "./macroStorage";
import { runMacroCommand, runMacroCommandWithFilePicker } from "./runMacroCommand";

export var macrosUri: vscode.Uri | null = null;

export function activate(context: vscode.ExtensionContext) {
    console.log("Macro Runner extension is now active!");

    const storagePath = context.globalStorageUri;
    macrosUri = vscode.Uri.joinPath(storagePath, "macros");

    const withProgress = (message: string, commandFunction: () => Promise<void>) => {
        return () => {
            vscode.window.withProgress(
                { location: vscode.ProgressLocation.Window, title: message },
                commandFunction
            );
        };
    };

    context.subscriptions.push(
        vscode.commands.registerCommand(
            "MacroRunner.runMacro",
            withProgress("macro running...", runMacroCommand)
        ),
        vscode.commands.registerCommand(
            "MacroRunner.runMacroLF",
            withProgress("(Large File) macro running...", runMacroCommandWithFilePicker)
        ),
        vscode.commands.registerCommand(
            "MacroRunner.runSavedMacro",
            withProgress("macro running...", runSavedMacroCommand)
        ),
        vscode.commands.registerCommand(
            "MacroRunner.newMacro",
            withProgress("creating new macro...", newMacroCommand)
        ),
        vscode.commands.registerCommand(
            "MacroRunner.loadMacro",
            withProgress("loading macro...", loadMacroCommand)
        ),
        vscode.commands.registerCommand(
            "MacroRunner.saveMacro",
            withProgress("saving macro...", saveMacroCommand)
        ),
        vscode.commands.registerCommand(
            "MacroRunner.removeMacro",
            withProgress("removing macro...", removeMacroCommand)
        ),
        vscode.commands.registerCommand(
            "MacroRunner.openMacrosDirectory",
            withProgress("opening macro...", openMacrosDir)
        )
    );
}

export function deactivate() {}
