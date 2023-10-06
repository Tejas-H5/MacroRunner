# Javascript Macro Runner

This extension allows you to read and modify the current file (or other files in the workspace) with some quickly written JavaScript.

**NOTE: the documentation has moved to the `New Macro` command template.**

## New Macro (Macro Runner) `MacroRunner.newMacro`

Opens and creates a new macro next to the currently opened file. It is just an untitled JavaScript file with some boilerplate, and also includes documentation for the entire API that has been exposed to macros. (This documentation used to be in this readme, and it was a pain to find).

## Run Macro (Macro Runner) `MacroRunner.runMacro`

Finds a macro in one of the open editor columns, and runs it on a file in one of the other editor columns.

## Run Macro (For large files > 50mb) (Macro Runner) `MacroRunner.runMacroLF`

Finds a macro in one of the open editor columns, loads all contents of a file chosen with a file picker to an untitled document, and runs the macro on that untitled document.
This a workaround I came up with for vscode extensions not supporting files > 50mb (https://github.com/jjuback/gc-excelviewer/issues/49), which are pretty easy to run into when processing large JSON or CSV blobs.

## Run saved macro (Macro Runner) `MacroRunner.runSavedMacro`

Loads a saved macro, and runs it on the file that is currently being edited.

## Cancel signal to running macros (Macro Runner) `MacroRunner.cancelAllMacros`

Sends a cancellation signal to all long-running macros. Whether they are actually cancelled or not depends on if they were coded correctly, because I wasn't able to figure out how to break infinite loops without Task Manager.

## Load Macro (Macro Runner) `MacroRunner.loadMacro`

Loads a saved macro, and opens it beside the current file, as done with the new macro template.

## Save Macro (Macro Runner) `MacroRunner.saveMacro`

Saves a macro to the extension directory, where you can load, run or delete it later.

## Delete Macro (Macro Runner) `MacroRunner.removeMacro`

Deletes a macro that was saved to the extension directory.

## Open Macros directory (Macro Runner) `MacroRunner.openMacrosDirectory`

Opens a file explorer at the extension directory.

## [ Not implemented yet ] Macro Slots 0 to 10 (Macro Runner) `MacroRunner.macroSlot[0 to 10]`

Assign these slots to saved macros in the extension settings. You can then run > Run Macro Slot 0 or whatever as a single command instead of going through the file picker. This also allows you to bind hotkeys to saved macros.
