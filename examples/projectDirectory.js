// macro : an example of how you can use the context.rootDir variable with require.
// If you wanted to quickly go through all files in the project, you would
// write it by hand with fs for now

let fs = require("fs");

const file = context.getFile();

const files = fs.readdirSync(context.rootDir);

file.text = files.join("\n");
