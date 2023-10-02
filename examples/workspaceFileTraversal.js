// macro v2 : A demo of the file traversal methods

const {
    walkWorkspaceFilesTopDown, // (async (fileUri: vscode.Uri) => Promise<any>) => Promise<any> - traverse files starting at the root and working down. can early-return a non-falsy value
    walkWorkspaceFilesBottomUp, // (async (fileUri: vscode.Uri) => Promise<any>) => Promise<any> - traverse files starting at the deepest files and working up. can early-return a non-falsy value
    getFileText, // async (fileUri: vscode.Uri | string) => Promise<string> - gets all text in a file
    setFileText // (fileUri: vscode.Uri | string, newText: string) => void - sets all text in a file (after macro has finished running)
} = context;

// walkWorkspaceFilesTopDown is good for early-returning from a search, like avoiding all sub-folders with a particular name.
// walkWorkspaceFilesBottomUp is good for when your algorithm assumes that all child folders and files have already been processed for it to work.

// Traverse all the files.
await walkWorkspaceFilesTopDown(async (uri) => {
    // TODO: figure out if there is a way to know that a file is in the 'excluded' category, i.e that the VSCode file explorer will grey it out,
    // like the node modules, files included in the .gitignore, etc. I couldn't find this in the VSCode extension API docs
    if (uri.path.includes("node_modules")) return;
    if (uri.path.includes(".git")) return;

    const text = await getFileText(uri);
    console.log(text);

    // Can do some sort of quick processing or analysis of the files
    // Can update the file contents with setFileText(newText);
});
