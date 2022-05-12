import * as vscode from "vscode";

export const getDefaultURI = () => {
    let uri = undefined;
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0]) {
        uri = vscode.workspace.workspaceFolders[0].uri;
    }

    return uri;
};

export const osFileOpener = async (uri: vscode.Uri | undefined) => {
    if (!uri) return;

    const files = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        defaultUri: uri,
    });

    if (!files || files.length === 0) {
        return;
    }

    const bytes = await vscode.workspace.fs.readFile(files[0]);
    return bytes;
};
