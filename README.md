
# MacroRunner
Allows you to use JavaScript to automate the editing of text documents, and is designed to be as simple to use as possible. Extremely useful to automate some simple text editing tasks that are hard to quickly do using the existing visual studio commands.

Use the `MacroRunner: New Macro` command from the `Ctrl+Shift+P` menu to create a new macro. The default macro template will open in a text editor to the side of whatever you're editing. 

Write your macro in this editor. For example, here is a simple script that increments all the chars in a document by 1:

```javascript
// macro

const file = context.getFile();

const cipherOffset = 1;
const stringBuilder = []

for(let i = 0; i < file.text.length; i++) {
    stringBuilder.push(String.fromCharCode(file.text.charCodeAt(i) + cipherOffset));
}

file.setText(stringBuilder.join(""));
```

When your macro is ready, run it with the `MacroRunner: Run macro` command. This command will attempt to find a visible editor with text that starts with '// macro', and then run that text as JavaScript code that will have access to text in the target document. If exactly two editors are open, then the editor that didn't have the macro in it is the tarteg. If more than two are open, then the document that currently has focus will be the target document. <b> !!! This extension makes no effort to validate the security of the code in a macro, as it assumes you are writing the code yourself. Only copy-paste and run macros from the internet if you know for sure that don't have malicious code in them. !!! </b>

Use the `MacroRunner: Save macro` command to save this macro to global storage for later, and then re-open this macro again whenever you want with the `MacroRunner: Load macro` command. The `MacroRunner: Delete macro` and `MacroRunner: Open macros directory` commands also exist, do exactly what you think they do.

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

# Possible additional features

- The ability to select a document from the editor by name
- The ability to run a macro on multiple documents at once
- The ability to run a macro multiple times at once
- Adding key-binds to a macro

# Known issues

- stack-overflow exceptions will not be silently ignored, and will cause the edtior to crash. E.g something like this will cause mysterious errors till you notice the tiny typo and kick yourself:
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
const runmacro = (context, debug, ...injectedFunctions) => {
    // your macro code is copy-pasted here, and has access to all the injected objects above
}
```
Except that it won't have access to global scope, because it is wrapped in a string and then compiled with a <code l='JavaScript'>Function()</code> object.

[//]: # "Anchor point"

    
## context : ScriptContext
You will be using this object to get the target file, create new output files, and possibly animations.



<details>
<summary>
    <code class="Language-typescript"> context.getFile(index?=0) -> EditableFile</code></p>

</summary>

> Use `getFile()` to get the currently active file as an `EditableFile` object. 
The index is zero by default, which points to the target file. 
An index greater than 0 can be provided to access files that were newly created with `newFile`.

</details>



<details>
<summary>
    <code class="Language-typescript"> context.newFile(text="") -> EditableFile</code></p>

</summary>

> Use `newFile()` to create a new output file as an `EditableObject` object. 
Text can be provided to set it's initial text.

</details>



<details>
<summary>
    <code class="Language-typescript">async context.outputImmediate(index=0)</code></p>

</summary>

> Use `outputImmediate()` to push the current text in a file directly to the target file immediately.
This has no real use other than novelty, in that it can be used along with `setInterval`/`loop` to make animations.
There was no real reason for me to add this, or the interval method overrides, I just did it for fun.
See the GOL example to see how to use

</details>



Possible additions: 

- Some way to open files in the workspace by name/glob and make changes to them

    
## file : EditableFile
This is the object that you will use to edit a file. 
Note that you aren't editing the actual document, rather, you
are making changes to a normal javascript string, and the extension will replace all text in the target document with the new text after the macro has ran.
I've also added a bunch of string manipulation utility functions that I found useful.



<details>
<summary>
    <code class="Language-typescript"> file.text : string</code></p>

</summary>

> The text of this document. 
If this is a target document referring to an actual open document, it will contain text as well as information about the current selection.

</details>



<details>
<summary>
    <code class="Language-typescript"> file.initialSelectedRanges : [number, number][]</code></p>

</summary>

> Get all of the selected ranges in the current document

</details>



<details>
<summary>
    <code class="Language-typescript"> file.newSelectedRanges : [number, number][]</code></p>

</summary>

> New ranges that will be selected after the macro is run. Make the start and end the same in [start,end] to get a position instead of a range.

</details>



<details>
<summary>
    <code class="Language-typescript"> file.setText(newText:string)</code></p>

</summary>

> Same as `file.text = newText`, but will throw an error if the object you're passing isn't a `typeof 'string'` or `instanceof String`.

</details>



<details>
<summary>
    <code class="Language-typescript"> file.markUndoPoint()</code></p>

</summary>

> Save the value of file.text as an 'undo point'. 
The extension will then replay all of these undo points  onto the target document before the final output, so that you can undo/redo between them - possibly for debugging purposes. 

</details>



<details>
<summary>
    <code class="Language-typescript"> file.matchAllArray(expr: RegExp | string) -> RegExpMatchArray[]</code></p>

</summary>

> Short for `Array.from(file.getText.matchAll(expr))`

</details>



<details>
<summary>
    <code class="Language-typescript"> file.matchAllPositions(expr: RegExp | string) -> number[]</code></p>

</summary>

> Same as matchAllArray but collects all match indices

</details>



<details>
<summary>
    <code class="Language-typescript"> file.matchAllRanges(expr: RegExp | string) -> [number, number][]</code></p>

</summary>

> Same as matchAllArray but collects all ranges.  A range is defined as a tuple [start,end] where start is the start of the match (inclusive) and end is the end of a match (exclusive, 1 after the end of a match).

</details>



<details>
<summary>
    <code class="Language-typescript"> file.matchNext(expr: RegExp | string, position: number = 0) -> RegExpMatchArray</code></p>

</summary>

> Same as JavaScript's string.indexOf, but you can use regex

</details>



<details>
<summary>
    <code class="Language-typescript"> file.replaceMany(ranges: [number, number][], strings: string[]) -> number[][]</code></p>

</summary>

> Replaces all specified ranges in the text with the corresponding string.  Modulo will be used to loop through strings if fewer strings than ranges are provided.  It then returns all the new range positions. 
Overlapping ranges will throw an exception. 
The ranges will also be returned in sorted order based on their starting point, as this is a side-effect of checking for overlapping ranges.

</details>



<details>
<summary>
    <code class="Language-typescript"> file.removeMany(ranges: [number, number][]) -> number[][]</code></p>

</summary>

> Short for replaceMany(ranges, [""])

</details>



<details>
<summary>
    <code class="Language-typescript"> file.insertMany(positions: [number][]) -> number[]</code></p>

</summary>

> Short for replaceMany(ranges, [""])

</details>



<details>
<summary>
    <code class="Language-typescript"> file.replace(str: string, start: number, end: number)</code></p>

</summary>

> Short for `file.text.substring(0, start) + str + file.text.substring(end)`

</details>



<details>
<summary>
    <code class="Language-typescript"> file.insert(str: string, position: number)</code></p>

</summary>

> Short for `replace(str, position, position)`

</details>



<details>
<summary>
    <code class="Language-typescript"> file.remove(start: number, end: number)</code></p>

</summary>

> Short for `replace('', start, end);`

</details>



<details>
<summary>
    <code class="Language-typescript"> file.indexAfter(str: string, position: number = 0)</code></p>

</summary>

> Short for `text.indexOf(str, position) + str.length;`

</details>



<details>
<summary>
    <code class="Language-typescript"> file.lastIndexAfter(str: string, position: number = -1)</code></p>

</summary>

> Same as indexOf but in the reverse direction, and 1 index after the string to remain consistent with indexAfter

</details>



Possible additions: 

- `matchPrev(regExp)`. But making this efficient seems hard. Any PRers?

    
## debug : DebugContext
This object is used to log things.



<details>
<summary>
    <code class="Language-typescript">async context.info(message)</code></p>

</summary>

> Pushes an info message notification in VS-Code

</details>



<details>
<summary>
    <code class="Language-typescript">async context.error(message)</code></p>

</summary>

> Pushes an error message notification in VS-Code

</details>



Possible additions: 

- Some way to log to a console of some sort. 
I don't care to implement this for now because I can print text straight to the document, or use other debugging techniques
- Breakpoints. 
But I have no idea how to do this. 
Any PRers?

    
## ...injectedMethods
These are methods that have been injected for convenience, or to override the normal JavaScript method for whatever reason.



<details>
<summary>
    <code class="Language-typescript"> SetInterval(callback, milliseconds) -> NodeJS.Timeout, SetTimeout(callback, milliseconds) -> NodeJS.Timeout, ClearInterval(timeout: NodeJS.Timeout), ClearTimeout(timeout: NodeJS.Timeout),</code></p>

</summary>

> These are wrappers for the normal javascript methods that allow the extension to keep track of the TimerIDs so that it can await them. 
Doing this allows errors in these methods to be correctly displayed as error messages and not be silently ignored.

</details>



<details>
<summary>
    <code class="Language-typescript"> loop(callback(count) -> bool, milliseconds, loopCount=undefined|number)</code></p>

</summary>

> A wrapper for the setInterval method that allows for a loop counter, and accepts a callback  That can return `true` to break out of the loop and `false` 

</details>



Possible additions: 

- Low priority - Keyboard input. 
Any PRers ?

