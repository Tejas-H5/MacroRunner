const processTemplate = (templateText: string) => {
    const cursorIndex = templateText.indexOf("#cursor");
    templateText = templateText.replace("#cursor", "");
    return [templateText, cursorIndex] as const;
};

const [defaultMacro, defaultMacroCursorIndex] = processTemplate(`// macro v2

// Entire macro-runner API
const { 
    // frequently used functions
    getText,           // () => string - Gets all text from the adjacent file. 
    setText,           // (string) => void - Updates all text in the adjacent file (after macro has finished running)
    getSelectedRanges, // () => [int, int][] - Get all selected ranges, or null
    setSelectedRanges, // ([int, int][]) => void - Sets the selected ranges (after macro has finished running). Use it to write a macro that moves the cursor/s around
    
    // useful helpers
    processRanges,  // (text: string, ranges: [int, int][], processFunc: (string) => string) => string - Use this to write a macro that will process all selected regions in some text. The ranges are validated to not overlap, and are sorted and updated to their new positions in-place
    input,          // async (prompt: string) => Promise<string | undefined> - Get user input. Returns undefined if the user cancels. Don't forget to await it
    exit,           // (message: string) => never - throws a soft-error exception    

    // processing other files
    walkWorkspaceFilesTopDown,  // (async (fileUri: vscode.Uri) => Promise<any>) => Promise<any> - traverse files starting at the root and working down. can early-return a non-falsy value
    walkWorkspaceFilesBottomUp, // (async (fileUri: vscode.Uri) => Promise<any>) => Promise<any> - traverse files starting at the deepest files and working up. can early-return a non-falsy value
    getFileText,                // async (fileUri: vscode.Uri | string) => Promise<string> - gets all text in a file
    setFileText,                // (fileUri: vscode.Uri | string, newText: string) => void - sets all text in a file (after macro has finished running). Changes must then be saved manually
    
    // animations
    sleep,                    // async (milliseconds: number) => Promise<void> - await this function to sleep for some ms. It was easier for me to code than the timeout/interval functions
    applyChangesImmediately,  // async (shouldAddUndoPoint: boolean) => Promise<void> - applies all changes to the active file immediately, before the macro has completed. Used to add intermediate undo-stops by setting shouldAddUndoPoint=true.
    isCancelled,              // () => boolean - use isCancelled() to check if a cancel signal has been sent to the macro. Currently the only way to mitigate infinite loops other than Task manager
    
    // misc
    require,  // THE require function
} = context;

// Global namespace
//      console - a mock object containing a subset of the console functions - log, error, clear

// Typically, these macros run on the 'adjacent file' (the file that is open next to this macro), or the active file if running a saved macro.
// NOTE: avoid infinite loops, see isCancelled() above

// Write your code here:

let newText = "" + getText(); // "" + gives us string intellisense for newText

#cursor

setText(newText);

`);

export { defaultMacro, defaultMacroCursorIndex };
