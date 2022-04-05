// macro
// real use case - needed to find where the 'outcome' object would occur in a
// large list of json objects real quick

const file = context.getFile();
let lines = file.text.split("\n");
const paths = new Map();

let pathArr = ["obj"];

function search(obj, field) {
    if (typeof obj === "string") {
        return null;
    }

    for (let k in obj) {
        pathArr.push(k);
        if (k === field) {
            return obj[k];
        }

        const res = search(obj[k], field);
        if (res !== null && res !== undefined) {
            return res;
        }

        pathArr.pop();
    }

    return null;
}

for (const line of lines) {
    const obj = JSON.parse(line);

    pathArr = ["obj"];
    const res = search(obj, "outcome");

    if (res === null || res === undefined) {
        continue;
    }

    const path = pathArr.join(".");

    if (!paths.has(path)) {
        paths.set(path, 0);
    }
    paths.set(path, paths.get(path) + 1);
}

const newText = Array.from(paths.entries())
    .map(([k, v]) => k + ", " + v)
    .join("\n");

const output = context.newFile();
output.setText(newText);
