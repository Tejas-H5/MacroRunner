# Change Log

Note that this extension is currently in a phase where the API will change drastically from release to release.

## 2.0.0 The API improvement update 2023/X

Lots of breaking changes in this one:

-   The new macro starting template has been overhauled to be fully self-contained and self-documenting, without requiring a user to read the entire extension's README.
-   The extension's functionality has been almost completely overhauled, with a far better API that fixes a lot of the issues that I have had, and additional capabilities like logging, and reading/writing to arbitrary files in the workspace. There is no backwards compatibility - old macros will no longer work, and will need to be rewritten with the new API

## 1.2.4 The macro update 2022/05/22

-   Improved documentation
-   Improved API for selected ranges.
-   New command: Run saved macro
    -   I found myself loading a macro, running it, and then closing it a lot of times. This command speeds this up.
-   New function: `input(prompt: string) -> Promise<string>` to get input from the user.
    -   This combined with the "Run saved macro" command now make this extension actually able to run what most people would refer to as 'macros', which it couldn't before
-   New function: `exit(reason: string)`
    -   Needed to handle case of `input` being canceled, so I made this.
-   Changed command naming convention to be faster
-   1.2.3: Added one of those fancy gif things to the documentation.
-   1.2.4 2022/07/16: I just noticed that these gifs are way too zoomed out. hopefully this fixes things

## 1.1.0 2022/04/06

-   Fixed run macro command not working when you have an output log open
-   Fixed new macro opening in the wrong 'column'
-   Added a workaround for VS-Code extension host not being able to find large files. You will now have to manually find these the files
-   Added 1000 chars of verbose log to the stack trace for diagnostic purposes
-   Running a macro now shows a progress spinner at the bottom there
-   Added some more example use-cases to the repo

## 1.0.0 - 2022/03/28

-   Added all features
-   Renamed from macrorunner to ScriptRunner

<br>
<br>
<br>
<br>
<br>

<hr>

## 1.3.0 [have not yet started working on this]

-   [not started] Added integration tests
-   [not started] Added logging capabilities. Access a file using `getFile("filename") -> EditableFile`, and write to that.
