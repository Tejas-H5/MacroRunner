// macro
// yes this generates the function documentation.
// maybe I could add to the API to actually traverse the files and pull jsdocs ?

const createFunctionSection = ({ objectName, name, desc }) => {
    let async = false;
    if (name.indexOf("async ") !== -1) {
        async = true;
        name = name.replace("async ", "");
    }

    return `

<details>
<summary>
    <code class="Language-typescript">${async ? "async" : ""} ${
        objectName ? objectName + "." : ""
    }${name}</code></p>

</summary>

> ${desc}

</details>

`;
};

const createObjectSection = ({ heading, desc, methods, plans, objectName }) => {
    return `    
## ${heading}
${desc}

${methods ? methods.map((x) => createFunctionSection({ ...x, objectName: objectName })).join("") : ""}

${
    plans
        ? `Possible additions: 

${plans.map((plan) => `- ${plan}`).join("\n")}
`
        : ""
}
`;
};

const documentation = [
    {
        heading: "context : MacroContext",
        desc: `You will be using this object to edit the target file, and possibly create new output files.`,
        plans: [`Some way to open files in the workspace by name/glob and make changes to them`],
        objectName: "context",
        methods: [
            {
                name: "getFile(index?=0) -> EditableFile",
                desc: `Use \`getFile()\` to get the currently active file as an \`EditableFile\` object. 
The index is zero by default, which points to the target file. 
An index greater than 0 can be provided to access files that were newly created with \`newFile\`.`,
            },
            {
                name: 'newFile(text="") -> EditableFile',
                desc: `Use \`newFile()\` to create a new output file as an \`EditableObject\` object. 
Text can be provided to set it's initial text.`,
            },
            {
                name: "async outputImmediate(index=0)",
                desc: `Use \`outputImmediate()\` to push the current text in a file directly to the target file immediately.
This has no real use other than novelty, in that it can be used along with \`setInterval\`/\`loop\` to make animations.
There was no real reason for me to add this, or the interval method overrides, I just did it for fun.
See the GOL example to see how to use`,
            },
        ],
    },
    {
        heading: "file : EditableFile",
        desc: `This is the object that you will use to edit a file. 
Note that you aren't editing the actual document, rather, you
are making changes to a normal javascript string, and the extension will replace all text in the 
target document with the new text after the macro has ran.
I've also added a bunch of string manipulation utility functions that I found useful.
\`replaceMany\`, \`insertMany\` and \`removeMany\` in particular are super useful.`,
        plans: ["`matchPrev(regExp)`. But making this efficient seems hard. Any PRers?"],
        objectName: "file",
        methods: [
            {
                name: "text : string",
                desc: `The text of this document. 
If this is a target document referring to an actual open document, it will contain text as well as information about the current selection.`,
            },
            {
                name: "initialSelectedRanges : [number, number][]",
                desc: `Get all of the selected ranges in the current document`,
            },
            {
                name: "newSelectedRanges : [number, number][]",
                desc: `New ranges that will be selected after the macro is run. Make the start and end the same in [start,end] to get a position instead of a range.`,
            },
            {
                name: "setText(newText:string)",
                desc: `Same as \`file.text = newText\`, but will throw an error if the object you're passing isn't a \`typeof 'string'\` or \`instanceof String\`.`,
            },
            {
                name: "markUndoPoint()",
                desc: `Save the value of file.text as an 'undo point'. 
The extension will then replay all of these undo points  onto the target document before the final output, so that you can undo/redo between them - possibly for debugging purposes. `,
            },
            {
                name: "replaceMany(ranges: [number, number][], strings: string[]) -> number[][]",
                desc: `Replaces all specified ranges in the text with the corresponding string.  Modulo will be used to loop through strings if fewer strings than ranges are provided.  It then returns all the new range positions. 
Overlapping ranges will throw an exception. 
The ranges will also be returned in sorted order based on their starting point, as this is a side-effect of checking for overlapping ranges.`,
            },
            {
                name: "removeMany(ranges: [number, number][]) -> number[][]",
                desc: 'Short for `replaceMany(ranges, [""])`',
            },
            {
                name: "insertMany(positions: [number][], strings: string[]) -> number[]",
                desc: "Short for `replaceMany(positions.map(x => [x,x]), strings)`",
            },
            {
                name: "matchAllArray(expr: RegExp | string) -> RegExpMatchArray[]",
                desc: `Short for \`Array.from(file.getText.matchAll(expr))\``,
            },
            {
                name: "matchAllPositions(expr: RegExp | string) -> number[]",
                desc: `Same as matchAllArray but collects all match indices`,
            },
            {
                name: "matchAllRanges(expr: RegExp | string) -> [number, number][]",
                desc: `Same as matchAllArray but collects all ranges.  A range is defined as a tuple [start,end] where start is the start of the match (inclusive) and end is the end of a match (exclusive, 1 after the end of a match).`,
            },
            {
                name: "matchNext(expr: RegExp | string, position: number = 0) -> RegExpMatchArray",
                desc: `Same as JavaScript's string.indexOf, but you can use regex`,
            },

            {
                name: "replace(str: string, start: number, end: number)",
                desc: `Short for \`file.text.substring(0, start) + str + file.text.substring(end)\``,
            },
            {
                name: "insert(str: string, position: number)",
                desc: `Short for \`replace(str, position, position)\``,
            },
            {
                name: "remove(start: number, end: number)",
                desc: `Short for \`replace('', start, end);\``,
            },
            {
                name: "indexAfter(str: string, position: number = 0)",
                desc: `Short for \`text.indexOf(str, position) + str.length;\``,
            },
            {
                name: "lastIndexAfter(str: string, position: number = -1)",
                desc: `Same as indexOf but in the reverse direction, and 1 index after the string to remain consistent with indexAfter`,
            },
        ],
    },
    {
        heading: "debug : DebugContext",
        desc: `This object is used to log things.`,
        plans: [
            `Some way to log to a console of some sort. 
I don't care to implement this for now because I can print text straight to the document, or use other debugging techniques`,
            `Breakpoints. 
But I have no idea how to do this. 
Any PRers?`,
        ],
        objectName: "context",
        methods: [
            {
                name: "async info(message)",
                desc: `Pushes an info message notification in VS-Code`,
            },
            {
                name: "async error(message)",
                desc: `Pushes an error message notification in VS-Code`,
            },
        ],
    },
    {
        heading: "...injectedObjects",
        desc: `These are methods that have been injected for convenience, or to override the normal JavaScript method for whatever reason.`,
        plans: [
            `Low priority - Keyboard input. 
Any PRers ?`,
        ],
        methods: [
            {
                name: "rootDir:string",
                desc: "Use this to get the project root fsPath. This will fallback to the document's folder if no folder is open, and then fallback to being `undefined` if the macro is being run on an untitled file.",
            },
            {
                name: "require() -> module",
                desc: "JavaScript's require function, untouched. Use it to require whatever modules you need",
            },
            {
                name: "SetInterval(callback, milliseconds) -> NodeJS.Timeout, SetTimeout(callback, milliseconds) -> NodeJS.Timeout, ClearInterval(timeout: NodeJS.Timeout), ClearTimeout(timeout: NodeJS.Timeout),",
                desc: `These are wrappers for the normal javascript methods that allow the extension to keep track of the TimerIDs so that it can await them. 
Doing this allows errors in these methods to be correctly displayed as error messages and not be silently ignored.`,
            },
            {
                name: "loop(callback(count) -> bool, milliseconds, loopCount=undefined|number)",
                desc: `A wrapper for the setInterval method that allows for a loop counter, and accepts a callback  That can return \`true\` to break out of the loop and \`false\` `,
            },
        ],
    },
];

let documentationText = documentation.map(createObjectSection).join("");
const file = context.getFile();
const truncatedText = file.text.substring(0, file.lastIndexAfter('[//]: # "Anchor point"'));
file.setText(truncatedText + "\n\n" + documentationText);
