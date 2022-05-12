// macro
// This macro generates the API documentation for Macro Runner.
// Open this up next to the Readme side-by-side, and run this macro with
// the MacroRunner: Run Macro command

const createFunctionSection = ({ objectName, name, desc }) => {
    let async = false;
    if (name.indexOf("async ") !== -1) {
        async = true;
        name = name.replace("async ", "");
    }

    return `

### ${async ? "async " : ""}${objectName ? objectName + "." : ""}${name}

> ${desc}

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
                name: "rootDir:string",
                desc: "Use this to get the project root fsPath. This will fallback to the document's folder if no folder is open, and then fallback to being `undefined` if the macro is being run on an untitled file.",
            },
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
        desc: `This is the object that you will use to interface between the macro and a text file in Visual Studio.. 
Note that you aren't editing the actual text file, rather, you
are making changes to a normal javascript object, and the extension will see those changes and make them in the real document after the
macro is ran.`,
        plans: ["`matchPrev(regExp)`. But making this efficient seems hard. Any PRers?"],
        objectName: "file",
        methods: [
            {
                name: "text : string",
                desc: `The text in this file. Make changes to this in your macro. 
Optionally use \`setText\` instead of \`file.text=whatever\`, which will throw an exception
if you are passing in something that isn't a string.`,
            },
            {
                name: "selectedRanges : [rangeStart: number, rangeEnd: number][]",
                desc: `The current ranges in the document that are selected. 
Each number is a number index into the string.
Changes to this array will be reflected in the document after the macro has finished running.
If rangeStart and rangeEnd are both the same, you will have a cursor without anything selected. 
If the range object is null, it will be ignored.`,
            },
            {
                name: "setText(newText:string)",
                desc: `Same as \`file.text = newText\`, but will throw an exception if the object you're passing isn't a \`typeof 'string'\` or \`instanceof String\`.
The other functions don't do this kind of type checking, I can't be bothered adding it.`,
            },
            {
                name: "markUndoPoint()",
                desc: `Save the value of file.text as an 'undo point'. 
The extension will then replay all of these undo points onto the target document before the final output, 
so that you can undo/redo between them - possibly for debugging purposes. `,
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
They would be awesome, but I have no idea how to add them. It may require a massive rewrite.
Any PRers?`,
        ],
        objectName: "debug",
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
        heading: "...stringUtils",
        desc: `These are utility methods that make string editing much easier.`,
        plans: [
            `Low priority - Keyboard input. 
Any PRers ?`,
        ],
        methods: [
            {
                name: "replaceMany(text:string, ranges: [number, number][], strings: string[]) -> [newText: string, new ranges: [number, number][]]",
                desc: `Replaces all specified ranges in the text with the corresponding string. Modulo will be used to loop through strings if fewer strings than ranges are provided.  It then returns all the new range positions. 
Overlapping ranges will throw an exception. 
The ranges will also be returned in sorted order based on their starting point, as this is a side-effect of checking for overlapping ranges`,
            },
            {
                name: "removeMany(text:string, ranges: [number, number][]) -> [newText: string, new ranges: [number, number][]]",
                desc: 'Short for `replaceMany(ranges, [""])`',
            },
            {
                name: "insertMany(text:string, positions: [number][], strings: string[]) -> [newText: string, new ranges: [number, number][]]",
                desc: "Short for `replaceMany(positions.map(x => [x,x]), strings)`",
            },
            {
                name: "findAll(text:string, expr: RegExp | string) -> RegExpMatchArray[]",
                desc: `Short for \`Array.from(file.getText.matchAll(expr))\``,
            },
            {
                name: "findAllPositions(text:string, expr: RegExp | string) -> number[]",
                desc: `Same as findAll but collects all match indices`,
            },
            {
                name: "findAllRanges(text:string, expr: RegExp | string) -> [number, number][]",
                desc: `Same as matchAllArray but collects all ranges.  A range is defined as a tuple [start: number,end: number] 
where start is the start of the match (inclusive) and end is the end of a match (exclusive, 1 after the end of a match).`,
            },
            {
                name: "matchNext(text:string, expr: RegExp | string, position: number = 0) -> RegExpMatchArray",
                desc: `Same as JavaScript's string.indexOf, but you can use regex`,
            },

            {
                name: "replace(text:string, str: string, start: number, end: number)",
                desc: `Short for \`file.text.substring(0, start) + str + file.text.substring(end)\``,
            },
            {
                name: "insert(text:string, str: string, position: number)",
                desc: `Short for \`replace(str, position, position)\``,
            },
            {
                name: "remove(text:string, start: number, end: number)",
                desc: `Short for \`replace('', start, end);\``,
            },
            {
                name: "indexAfter(text:string, str: string, position: number = 0)",
                desc: `Short for \`text.indexOf(str, position) + str.length;\``,
            },
            {
                name: "lastIndexAfter(text:string, str: string, position: number = -1)",
                desc: `Same as indexOf but in the reverse direction, and 1 index after the string to remain consistent with indexAfter`,
            },
        ],
    },
    {
        heading: "...javascriptUtils",
        desc: `These are normal javascript methods that have been directly injected, or overridden:`,
        plans: [
            `Low priority - Keyboard input. 
Any PRers ?`,
        ],
        methods: [
            {
                name: "require() -> module",
                desc: "JavaScript's require function, untouched. Use it to require whatever modules you need",
            },
            {
                name: "async input(prompt: string) -> Promise<string>",
                desc: `Provides a way to input arguments to your macros. You will need to use \`await\` with this method. 
This method will throw an exception if the input is canceled, and prevent the rest of the macro from running. 
If you don't want this behaviour, put it in a try-catch.`,
            },
            {
                name: "SetInterval(callback, milliseconds) -> NodeJS.Timeout, SetTimeout(callback, milliseconds) -> NodeJS.Timeout, ClearInterval(timeout: NodeJS.Timeout), ClearTimeout(timeout: NodeJS.Timeout),",
                desc: `These are actually wrappers for the normal javascript methods that interop better with this extension.
It behaves exactly the same as the javascript method.`,
            },
            {
                name: "loop(callback(count) -> bool, milliseconds, loopCount=undefined|number)",
                desc: `A wrapper for the setInterval method that allows for a loop counter, and accepts a callback  
that can return \`true\` to break out of the loop and anything else to keep looping `,
            },
        ],
    },
];

let documentationText = documentation.map(createObjectSection).join("");
const file = context.getFile();
const truncatedText = file.text.substring(0, file.lastIndexAfter('[//]: # "Anchor point"'));
file.setText(truncatedText + "\n\n" + documentationText);
