import * as vscode from "vscode";
import {
    loadMacroCommand,
    saveMacroCommand,
    removeMacroCommand,
    newMacroCommand,
    openMacrosDirCommand,
    runSavedMacroCommand,
} from "./macroStorage";
import { runMacroCommand, runMacroCommandWithFilePicker } from "./runMacroCommand";
import { HardError } from "./logging";

var macrosUri: vscode.Uri | null = null;

/**  throws if macroUri was null for some reason (this is unlikely, but it could probably happen idk) */
export const getMacroURI = () => {
    if (!macrosUri) {
        throw new HardError("Macro URI was null");
    }

    return macrosUri;
};

export function activate(context: vscode.ExtensionContext) {
    console.log("Macro Runner extension is now active!");

    const storagePath = context.globalStorageUri;
    macrosUri = vscode.Uri.joinPath(storagePath, "macros");
    vscode.workspace.fs.createDirectory(macrosUri); // ensure this directory always exists

    const withProgress = (message: string, commandFunction: () => Promise<void>) => {
        return () => {
            vscode.window.withProgress(
                { location: vscode.ProgressLocation.Window, title: message },
                commandFunction
            );
        };
    };

    context.subscriptions.push(
        // Creating macros
        vscode.commands.registerCommand(
            "MacroRunner.newMacro",
            withProgress("creating new macro...", newMacroCommand)
        ),

        // Running macros
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

        // TODO: run macro 1 to run macro 10, and have config to set these file names.

        // Saving and loading macros
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
            withProgress("opening macro...", openMacrosDirCommand)
        )
    );
}

export function deactivate() {}
