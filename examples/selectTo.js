// macro
// move the selections to the next of whatever delimiter we input

const file = context.getFile();
let text = "" + file.text; // a hacky way to get autocomplete

const delim = await input("what delimieter should we select to?");

file.selectedRanges = file.selectedRanges.map(([start, end]) => {
    const next = text.indexOf(delim, end);
    const lineEnd = text.indexOf("\n", end);
    if (next === -1 || lineEnd === -1) {
        return;
    }

    if (lineEnd < next) {
        return null;
    }

    return [start, next];
});
