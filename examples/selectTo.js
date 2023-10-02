// macro v2 : A macro to move all multiple-cursor-selects to a particular delimiter on a line. I actually use this quite a lot

const {
    // frequently used functions
    getText, // () => string - Gets all text from the adjacent file.
    setText, // (string) => void - Updates all text in the adjacent file (after macro has finished running)
    getSelectedRanges, // () => [int, int][] - Get all selected ranges, or null
    setSelectedRanges, // ([int, int][]) => void - Sets the selected ranges (after macro has finished running). Use it to write a macro that moves the cursor/s around

    // useful helpers
    processRanges, // (text: string, ranges: [int, int][], processFunc: (string) => string) => string - Use this to write a macro that will process all selected regions in some text. The ranges are validated to not overlap, and are sorted and updated to thier new positions in-place
    input, // async (prompt: string) => Promise<string | undefined> - Get user input. Returns undefined if the user cancels. Don't forget to await it
    exit // (message: string) => never   - Shorthand for throw new SoftError(message || "macro has exited early")
} = context;

let selectedRanges = getSelectedRanges();
if (!selectedRanges) {
    exit("There are currently no selections");
}

const text = "" + getText();
const delim = await input("what delimiter should we select to?");
if (!delim) {
    exit("no delimiter chosen");
}

selectedRanges = selectedRanges
    .map(([start, end]) => {
        const next = text.indexOf(delim, end);
        const lineEnd = text.indexOf("\n", end);

        if (next === -1) {
            return;
        }

        if (lineEnd !== -1 && lineEnd < next) {
            return null;
        }

        console.log("sub: ", text.substring(start, next + delim.length), start, end, end - start);

        return [start, next + delim.length];
    })
    .filter((range) => !!range);

setSelectedRanges(selectedRanges);
