const defaultMacro = `// macro
// Find documentation about the injected objects here: [TODO: add link here once we're finished documenting this]

const file = macroContext.getFile();
// Wrap text in a string for string autocomplete, even though file.text is already a string
` + 
"let text = `${file.text}`;" + 
`

// Make your modifications here



file.text = text;
debug.info("macro completed");
`





const testingMacro = `
//macro



`;



export default defaultMacro;
