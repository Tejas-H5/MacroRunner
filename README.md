
# Macro Runner
A quick way to make edits to a single document using some disposable JavaScript. Since you can also run arbitrary JavaScript code and you are working with a string instead of vscode's editBuilder API, the sky is the limit. 

Use the `New Macro` command from the `Ctrl+Shift+P` menu to create a new macro. The default macro template will open in a text editor to the side of whatever you're editing. 

Then, write your macro. For example, here is a simple script that increments all the chars in a document by 1:

```javascript
// macro
const file = context.getFile();

const cipherOffset = 1;
const stringBuilder = []
for (let i = 0; i < file.text.length; i++) {
    stringBuilder.push(String.fromCharCode(file.text.charCodeAt(i) + cipherOffset));
}

file.setText(stringBuilder.join(""));
```
(Find more examples in the `examples` folder)

When your macro is ready, run it with the `Run macro` command. This command attempts to find a visible editor with a macro and a target editor. If both are found, the code in the macro editor will be run on the target editor. If exactly two editors are open, then the target editor is the one without the macro. If more than two editors are open, then the target is the one with the cursor in it.

Use the `Save macro` command to save this macro to global storage for later, and then re-open this macro again whenever you want with the `Load macro` command. The `Delete macro` and `Open macros directory` commands also exist, do exactly what you think they do.

## Limitations

You will find that the `Run Macro` command simply doesn't work for files that are larger than 50mb. At the moment, all VSCode extensions are [unable to interact with files > 50mb in size](https://github.com/microsoft/vscode/issues/31078), so you will have to use the `Run Macro (For large files > 50mb)` command. This is identical to the `Run Macro` command, but it will ask you to manually open a file, and then rather than editing the file itself, it will bring the result into a new untitled document.

# Other use cases

Sometimes you may want to do a bunch of processing on a document, and then output those results to a new document. You can do something like this:

```javascript
const file = context.getFile();

// do some processing on the file
const result = someProcessingOnTheFile(file.text);

const output = context.newFile();
output.setText(result);
```

This will create a new file with `result` as it's contents.

It is also possible to make changes to a document based on the current cursor positions or selections, and to set new cursor positions/selections.

Some basic text based animation is also supported, although not the main focus. Take a look at the `GOL.js` examples in the `examples` folder, and then read the documentation on `context.outputImmediate` and `loop` to understand how it works under the hood.

# Features I won't add:
I won't be adding any feature that causes the API to become more complicated than it already is. 
For instance, utility functions that wrap vscode's filesystem API to access and write to any workspace file would necessarily need to be `async`, and I don't particularly like writing `await` in front of every single function when to avoid any bugs that I would get from forgetting an `await` (but if you really wanted to do something like this, checkout the `projectDirectory` example in the examples folder).


# Possible additional features

So it turns out that I am using this extension a lot more than even I thought I would. There are a few things that I now need to add:

- Some way to create an output and log it somewhere. We can output text to a new file, but I would like to be able to output to the same file over and over
- Some way to do debug logging. the vscode error messages aren't enough. Probably to a file that persists in global storage

# Known issues

Stack-overflow exceptions will be silently ignored, and will cause the edtior to crash. E.g something like this may frustrate you to no end till you notice the typo and kick yourself:
```javascript
const stringBuilder = []

for(let i = 0; i = file.text.length; i++) {
    stringBuilder.push(String.fromCharCode(file.text.charCodeAt(i) + cipherOffset));
}
```


# API Documentation / details

One problem with this approach to macros is that even though you will be writing far less code that is far simpler, you won't get any autocomplete, so I have to write a bunch of documentation on all of the objects that I've injected (sigh). There may be functions that I omit due to them being too insignificant.

## Injected objects?

Your macro is ran by using a `Function()` JavaScript object (not easy to find docs on this unless you are looking for documentation on [`eval()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval#never_use_eval!)).
You can see what this call looks like for yourself `runmacroCommand.ts`, if that's your thing, and you will notice that some objects are being injected into it.

For those of you who didn't peer at the source code, think of it as basically looking something like this:

```javascript
const runmacro = (context, debug, ...injectedObjects) => {
    // your macro code is copy-pasted here, and has access to all the injected objects above
}
```
Except that it won't have access to global scope, because it is wrapped in a string and then compiled with a <code l='JavaScript'>Function()</code> object.

[//]: # "Anchor point"

    
## context : MacroContext
You will be using this object to edit the target file, and possibly create new output files.



### context.getFile(index?=0) -> EditableFile

> Use `getFile()` to get the currently active file as an `EditableFile` object. 
The index is zero by default, which points to the target file. 
An index greater than 0 can be provided to access files that were newly created with `newFile`.



### context.newFile(text="") -> EditableFile

> Use `newFile()` to create a new output file as an `EditableObject` object. 
Text can be provided to set it's initial text.



### async context.outputImmediate(index=0)

> Use `outputImmediate()` to push the current text in a file directly to the target file immediately.
This has no real use other than novelty, in that it can be used along with `setInterval`/`loop` to make animations.
There was no real reason for me to add this, or the interval method overrides, I just did it for fun.
See the GOL example to see how to use



Possible additions: 

- Some way to open files in the workspace by name/glob and make changes to them

    
## file : EditableFile
This is the object that you will use to edit a file. 
Note that you aren't editing the actual document, rather, you
are making changes to a normal javascript string, and the extension will replace all text in the 
target document with the new text after the macro has ran.
I've also added a bunch of string manipulation utility functions that I found useful.
`replaceMany`, `insertMany` and `removeMany` in particular are super useful.



### file.text : string

> The text of this document. 
If this is a target document referring to an actual open document, it will contain text as well as information about the current selection.



### file.initialSelectedRanges : [number, number][]

> Get all of the selected ranges in the current document



### file.newSelectedRanges : [number, number][]

> New ranges that will be selected after the macro is run. Make the start and end the same in [start,end] to get a position instead of a range.



### file.setText(newText:string)

> Same as `file.text = newText`, but will throw an error if the object you're passing isn't a `typeof 'string'` or `instanceof String`.



### file.markUndoPoint()

> Save the value of file.text as an 'undo point'. 
The extension will then replay all of these undo points  onto the target document before the final output, so that you can undo/redo between them - possibly for debugging purposes. 



### file.replaceMany(ranges: [number, number][], strings: string[]) -> number[][]

> Replaces all specified ranges in the text with the corresponding string.  Modulo will be used to loop through strings if fewer strings than ranges are provided.  It then returns all the new range positions. 
Overlapping ranges will throw an exception. 
The ranges will also be returned in sorted order based on their starting point, as this is a side-effect of checking for overlapping ranges.



### file.removeMany(ranges: [number, number][]) -> number[][]

> Short for `replaceMany(ranges, [""])`



### file.insertMany(positions: [number][], strings: string[]) -> number[]

> Short for `replaceMany(positions.map(x => [x,x]), strings)`



### file.matchAllArray(expr: RegExp | string) -> RegExpMatchArray[]

> Short for `Array.from(file.getText.matchAll(expr))`



### file.matchAllPositions(expr: RegExp | string) -> number[]

> Same as matchAllArray but collects all match indices



### file.matchAllRanges(expr: RegExp | string) -> [number, number][]

> Same as matchAllArray but collects all ranges.  A range is defined as a tuple [start,end] where start is the start of the match (inclusive) and end is the end of a match (exclusive, 1 after the end of a match).



### file.matchNext(expr: RegExp | string, position: number = 0) -> RegExpMatchArray

> Same as JavaScript's string.indexOf, but you can use regex



### file.replace(str: string, start: number, end: number)

> Short for `file.text.substring(0, start) + str + file.text.substring(end)`



### file.insert(str: string, position: number)

> Short for `replace(str, position, position)`



### file.remove(start: number, end: number)

> Short for `replace('', start, end);`



### file.indexAfter(str: string, position: number = 0)

> Short for `text.indexOf(str, position) + str.length;`



### file.lastIndexAfter(str: string, position: number = -1)

> Same as indexOf but in the reverse direction, and 1 index after the string to remain consistent with indexAfter



Possible additions: 

- `matchPrev(regExp)`. But making this efficient seems hard. Any PRers?

    
## debug : DebugContext
This object is used to log things.



### async context.info(message)

> Pushes an info message notification in VS-Code



### async context.error(message)

> Pushes an error message notification in VS-Code



Possible additions: 

- Some way to log to a console of some sort. 
I don't care to implement this for now because I can print text straight to the document, or use other debugging techniques
- Breakpoints. 
But I have no idea how to do this. 
Any PRers?

    
## ...injectedObjects
These are methods that have been injected for convenience, or to override the normal JavaScript method for whatever reason.



### rootDir:string

> Use this to get the project root fsPath. This will fallback to the document's folder if no folder is open, and then fallback to being `undefined` if the macro is being run on an untitled file.



### require() -> module

> JavaScript's require function, untouched. Use it to require whatever modules you need



### SetInterval(callback, milliseconds) -> NodeJS.Timeout, SetTimeout(callback, milliseconds) -> NodeJS.Timeout, ClearInterval(timeout: NodeJS.Timeout), ClearTimeout(timeout: NodeJS.Timeout),

> These are wrappers for the normal javascript methods that allow the extension to keep track of the TimerIDs so that it can await them. 
Doing this allows errors in these methods to be correctly displayed as error messages and not be silently ignored.



### loop(callback(count) -> bool, milliseconds, loopCount=undefined|number)

> A wrapper for the setInterval method that allows for a loop counter, and accepts a callback  That can return `true` to break out of the loop and `false` 



Possible additions: 

- Low priority - Keyboard input. 
Any PRers ?

