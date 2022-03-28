# MacroRunner
Allows you to use JavaScript to programmatically edit a text document as simply and quickly as possible. The API is designed to be as simple and easy to use as possible, and 

# The bare minimum knowledge

Use the `New Script` command to create a new script. It opens up to the side of whatever you're editing as a javascript file. Write your script like this:

```javascript
// script

const file = context.getFile();

file.insertMany(context.initialSelectedPositions, "new text");

file.setText(
    file.text + 
    "\n\n" +
    "This file was modified at " + new Date().toISOString()
);
```

And then run your script with the `Run Script` command. This is all you really need to know, but the API offers some more functionality that you can read about in the following sections.

# How to use

This extension adds 5 new commands to VS-Code that you can access via the command menu (`Ctrl + Shift + P`) which are used to create, run, save, load and delete scripts.
```
Script Runner: New Script
Script Runner: Run Script
Script Runner: Save Script
Script Runner: Load Script
Script Runner: Remove Script
```

## New script

This command will open up the default script template into a split configuration, where you can immediately start writing code.

The document won't have any autocomplete, as it doesn't know about the objects and functions that the extension is injecting above the code when it will be ran. Take a look at the examples folder in this repo, or the API Documentation section below for reference.

## Run script

This command will attempt to find a visible editor with valid script text in it, and then run that script on any other visible document. If more than one document is visible, you will need to bring focus to the one in which you want the script to run. <b> !!! This extension makes no effort to validate the security of the code in a script, as it assumes you are writing the code yourself. Only copy-paste and run scripts from the internet if you know for sure that don't have malicious code in them. !!! </b>

## Save script

This command will save your script as a JavaScript file with the name that you specify. You will then be editing the version of the script that has been saved to disk, so any further saves can be made directly to the file itself without using the `Save script` command again.

## Load script

This command will search the saved scripts directory for all scripts, and allow you to load one of them by name. The script will then be opened in a new editor in a way similar to the `New script` command.

## Remove script

This command will recycle-bin-delete a script that you specify. It will no longer appear in the list you get with the `Load script` command.

# API Documentation / details

Before the script gets run, the extension needs to find the text editor with the script in it, as well as the text editor which we want to run the script in. 
The extension will search all visible files for text where the first line contains the word 'script' somewhere in it, non-case-sensitive. 

Your script is run by using a `Function()` JavaScript object (not easy to find docs on this unless you are looking for documentation on [`eval()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval#never_use_eval!)).
You can see what this call looks like for yourself `runScriptCommand.ts`, if that's your thing, and you will notice that some objects are being injected into it.

For those of you who didn't peer at the source code, think of it as basically looking something like this:

```javascript
const runScript = (context, debug, ...injectedFunctions) => {
    // your script code is copy-pasted here, and has access to all the injected objects above
}
```
Except that it won't have access to global scope, because it is wrapped in a string and then compiled with a <code l='javascript'>Function()</code> object.

One problem with this approach is that while it significantly simplifies and reduces the code you will have to write, it doesn't give any autocomplete, so now I have to write a bunch of documentation on everything (sigh). There may be functions that I omit due to them being too insignificant. (I have actually used this extension to generate this documentation),

    
## context : ScriptContext
You will be using this object to get the target file, create new output files, and possibly animations (yes you read that last bit right)



<details>
<summary>
    <code class="Language-typescript"> context.getFile(index?=0) -> EditableFile</code></p>

</summary>

> Use `getFile()` to get the currently active file as an `EditableFile` object.The index is zero by default, which points to the target file.An index greater than 0 can be provided to access files that were newly created with `newFile`.

</details>



<details>
<summary>
    <code class="Language-typescript"> context.newFile(text="") -> EditableFile</code></p>

</summary>

> Use `newFile()` to create a new output file as an `EditableObject` object.Text can be provided to set it's initial text.

</details>



<details>
<summary>
    <code class="Language-typescript"> context.async outputImmediate(index=0)</code></p>

</summary>

> Use `outputImmediate()` to push the current text in a file directly to the target file immediately.This has no real use other than novelty, in that it can be used along with `setInterval`/`loop` to make animations.There was no real reason for me to add this, or the interval method overrides, I just did it for fun.See the GOL example to see how to use

</details>



Possible additions: 

- Some way to open files in the workspace by name/glob and make changes to them

    
## file : EditableFile
This is the object that you will use to files. Note that you aren't editing the actual document, rather, you
are making changes to a normal javascript string, and the extension will replace all text in the target document with the new text.



<details>
<summary>
    <code class="Language-typescript"> file.text, setText(newText:string)</code></p>

</summary>

> Get and set the text on the object. Most of your scripts will use these

</details>



<details>
<summary>
    <code class="Language-typescript"> file.markUndoPoint()</code></p>

</summary>

> Save the current value text as un 'undo point'. The extension will then replay all of these undo points Onto the target document before the final output, so that you can undo/redo between them - possibly for debugging purposes. 

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

> Same as matchAllArray but collects all ranges. A range is defined as a tuple [start,end] where start is the start of the match (inclusive) and end is the end of a match (exclusive, 1 after the end of a match).

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

> Replaces all specified ranges in the text with the corresponding string. Modulo will be used to loop through strings if fewer strings than ranges are provided. It then returns all the new range positions. Overlapping ranges will throw an exception.The ranges will also be returned in sorted order based on their starting point, as this is a side-effect of checking for overlapping ranges.

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
    <code class="Language-typescript"> context.async info(message)</code></p>

</summary>

> Pushes an info message notification in VS-Code

</details>



<details>
<summary>
    <code class="Language-typescript"> context.async error(message)</code></p>

</summary>

> Pushes an error message notification in VS-Code

</details>



Possible additions: 

- Some way to log to a console of some sort. I don't care to implement this for now because I can print text straight to the document, or use other debugging techniques

    
## ...injectedMethods
These are methods that have been injected for convenience, or to override the normal JavaScript method for whatever reason.



<details>
<summary>
    <code class="Language-typescript"> SetInterval(callback, milliseconds) -> NodeJS.Timeout,SetTimeout(callback, milliseconds) -> NodeJS.Timeout,ClearInterval(timeout: NodeJS.Timeout),ClearTimeout(timeout: NodeJS.Timeout),</code></p>

</summary>

> These are wrappers for the normal javascript methods that allow the extension to keep track of the TimerIDs so that it can await them.Doing this allows errors in these methods to be correctly displayed as error messages and not be silently ignored.

</details>



<details>
<summary>
    <code class="Language-typescript"> loop(callback(count) -> bool, milliseconds, loopCount=undefined|number)</code></p>

</summary>

> A wrapper for the setInterval method that allows for a loop counter, and accepts a callback That can return `true` to break out of the loop and `false` 

</details>



Possible additions: 

- Low priority - Keyboard input. Any PRers ?

