import * as vscode from "vscode";
import {
    loadScriptCommand,
    saveScriptCommand,
    removeScriptCommand,
    newScriptCommand,
    openScriptsDir,
} from "./scriptStorage";
import { runScriptCommand } from "./runScriptCommand";

export var scriptsUri: vscode.Uri | null = null;

export function activate(context: vscode.ExtensionContext) {
    console.log("ScriptRunner extension is now active!");

    const storagePath = context.globalStorageUri;
    scriptsUri = vscode.Uri.joinPath(storagePath, "scripts");

    context.subscriptions.push(
        vscode.commands.registerCommand("ScriptRunner.newScript", newScriptCommand),
        vscode.commands.registerCommand("ScriptRunner.runScript", runScriptCommand),
        vscode.commands.registerCommand("ScriptRunner.loadScript", loadScriptCommand),
        vscode.commands.registerCommand("ScriptRunner.saveScript", saveScriptCommand),
        vscode.commands.registerCommand("ScriptRunner.removeScript", removeScriptCommand),
        vscode.commands.registerCommand("ScriptRunner.openScriptsDirectory", openScriptsDir)
    );
}

export function deactivate() {}
