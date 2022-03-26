const defaultMacro = `// macro
// Find documentation about the injected objects here: https://github.com/El-Tejaso/macrorunner

const file = context.getFile();
let text = \`\${file.getText()}\`; // autocomplete purposes. I don't know how to inject autocomplete just yet

// Make your modifications here


file.setText(text);
debug.info("macro completed");
`;

export default defaultMacro;
