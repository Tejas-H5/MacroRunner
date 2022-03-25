# macrorunner
Provides a simple yet powerful API for making edits to the currently active text document with JavaScript. 

## Goal
While async/await code is more performant, it can be quite cumbersome to write any kind of parsing/generative code. My aim with this extension is to provide an extremely simple programming experience with no use of the async/await paradigm that is for the most part extremely easy to use.

## How to use
Press ctrl+shift+P to open up the command menu, and search for the "New Macro" command. This should pop open a JavaScript file to either the left or the right with a default macro template.

(Screenshot)

The file contents are returned as a string. We can perform whatever edits needed to this file, and once the macro completes, the edits should get applied to the other file.