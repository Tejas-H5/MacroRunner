const processTemplate = (templateText: string) => {
    const cursorIndex = templateText.indexOf("#cursor");
    templateText = templateText.replace("#cursor", "");
    return [templateText, cursorIndex] as const;
};

const [defaultMacro, defaultMacroCursorIndex] = processTemplate(`// macro v2
// NOTE: avoid infinite loops, they can only be broken out of with Task Manager
// Typically, these macros run on the 'adjacent file' (the file that is open next to this macro), or the active file if running a saved macro.

const { 
    // main functions
    getText,           // () => string - Gets all text from the adjacent file
    setText,           // (string) => void - Updates all text in the adjacent file (after macro has finished running)
    getSelectedRanges, // () => [int, int][] - Get all selected ranges, or null
    setSelectedRanges, // ([int, int][]) => void - Sets the selected ranges (after macro has finished running). Use it to write a macro that moves the cursor/s around
    
    // useful helpers
    processRanges,  // (text: string, ranges: [int, int][], processFunc: (string) => string) => string - Use this to write a macro that will process all selected regions in some text. The ranges are validated to not overlap, and are sorted and updated to thier new positions in-place
    input,          // async (prompt: string) => Promise<string | undefined> - Get user input. Returns undefined if the user cancels. Don't forget to await it
    exit,           // (message: string) => never   - Shorthand for throw new SoftError(message || "macro has exited early")
    console,        // a mock object containing console.log and console.error

    // processing other files
    walkWorkspaceFilesTopDown,  // ((filePath: vscode.Uri) => Promise<any>) => Promise<any> - traverse files starting at the root and working down
    walkWorkspaceFilesBottomUp, // ((filePath: vscode.Uri) => Promise<any>) => Promise<any> - traverse files starting at the deepest files and working up
    getFileText,                // (filePath: vscode.Uri | string) => string        - gets all text in a file
    setFileText,                // (filePath: vscode.Uri | string, newText: string) => void - sets all text in a file (after macro has finished running)
    
    // animations
    setTimeout, clearTimeout, setInterval, clearInterval,       // Thin wrappers around the regular timeout functions. 
    applyChangesImmediately,            // async () => void - blits the current changes made to the active file immediately, before the macro has completed. Can be used to add intermediate undo points, or alongside the timeouts to make some scuffed ASCII animations
    
    // misc
    require,  // THE require function
} = context;

// Write your code here

let newText = "" + getText(); // "" + gives us string intellisense for newText

#cursor

setText(newText);

`);

export { defaultMacro, defaultMacroCursorIndex };
