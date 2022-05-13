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

### \`${async ? "async " : ""}${objectName ? objectName + "." : ""}${name}\`

> ${desc}`;
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
}`;
};

const documentation = [
    {
        heading: "context : MacroContext",
        desc: `You will be using this object to edit the target file, and possibly create new output files.`,
        plans: [`Some way to open files in the workspace by name/glob and make changes to them`],
        objectName: "context",
        methods: [
            {
                name: "getFile() -> EditableFile",
                desc: `Use \`getFile()\` to get the currently active file as an \`EditableFile\` object. 
I may be changing this method to accept a string, which you can use to get a file by name.`,
            },
            {
                name: 'newFile(text="") -> EditableFile',
                desc: `Use \`newFile()\` to create a new output file as an \`EditableObject\` object. 
Text can be provided to set it's initial text.`,
            },
            {
                name: "rootDir:string",
                desc: "Use this to get the project root fsPath. This will fallback to the document's folder if no folder is open, and then fallback to being `undefined` if the macro is being run on an untitled file.",
            },
            {
                name: "async outputImmediate()",
                desc: `Use \`outputImmediate()\` to push the current text directly to the target file immediately.
This has no real world use other than novelty, in that it can be used along with \`setInterval\`/\`loop\` to make animations.
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
                desc: `The text in this file. Make changes to this in your macro.`,
            },
            {
                name: "setText(newText:string)",
                desc: `Same as \`file.text = newText\`, but will throw an exception if the object you're passing isn't a \`typeof 'string'\` or \`instanceof String\`.
The other functions won't do this kind of type checking (nor do I want to spend time adding it)`,
            },
            {
                name: "selectedRanges : [rangeStart: number, rangeEnd: number][]",
                desc: `The current ranges in the document that are selected. 
A range is a tuple of integers \`[start, end]\`, which are indices into the string.
If you only have cursor positions instead of selections, then both \`start\` and \`end\` will be the same.
If the range object is null, it will be ignored.`,
            },
            {
                name: "markUndoPoint()",
                desc: `Push the current value of file.text onto an array as an 'undo point'. 
The extension will then replay all of these undo points onto the target document before the final output, 
so that you can undo/redo between them - possibly for debugging purposes.`,
            },
        ],
    },
    {
        heading: "debug : DebugContext",
        desc: `This object is used to log things.`,
        plans: [
            `Breakpoints. 
They would be awesome, but I have no idea how to add them. It may require a massive rewrite, which I don't want to do.
Ideas are welcome.`,
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
If the input was canceled, it returns null.`,
            },
            {
                name: "exit(reason: string)",
                desc: `Exits the program, and shows an info popup containing \`reason\` .
You can technically just type \`return;\` to end the macro early since it's being pasted into an async Javascript function, but
the editor does a red underline which is rightfully there but very distracting, so I added this method.`,
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
                desc: `Replaces all specified ranges in the text with the corresponding string. 
Modulo will be used to loop through strings if fewer strings than ranges are provided.  
Overlapping ranges will throw an exception.
It then returns a tuple \`[newText:string, newRanges: [number, number][]]\`.
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
];

let documentationText = documentation.map(createObjectSection).join("");
const file = context.getFile();
let text = file.text;
text = text.substring(0, lastIndexAfter(text, '[//]: # "Anchor point"'));
file.setText(text + "\n\n" + documentationText);
