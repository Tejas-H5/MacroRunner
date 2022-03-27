const toRegexGlobal = (expr: string | RegExp) => {
    if (expr instanceof RegExp) {
        let flags = expr.flags;
        if (flags.indexOf("g") === -1) {
            flags += "g";
        }
        return new RegExp(expr, flags);
    } else {
        return new RegExp(expr, "g");
    }
};

export default class EditableFile {
    private text: string;
    private isDebug: boolean;
    intermediateStates: string[];

    newSelectedRanges: [number, number][];

    constructor(text: string) {
        this.text = text;
        this.intermediateStates = new Array<string>();
        this.isDebug = false;
        this.newSelectedRanges = new Array<[number, number]>();
    }

    setText(newText: string) {
        if (this.isDebug) {
            this.markUndoPoint();
        }
        this.text = newText;
    }

    getText() {
        return this.text;
    }

    markUndoPoint() {
        this.intermediateStates.push(this.text);
    }

    matchAllArray(expr: RegExp | string) {
        expr = toRegexGlobal(expr);
        return Array.from(this.text.matchAll(expr));
    }

    matchAllPositions(expr: RegExp | string) {
        expr = toRegexGlobal(expr);
        const matches = this.text.matchAll(expr);
        let positions: number[] = [];

        for (const match of matches) {
            if (match.index !== undefined) {
                positions.push(match.index);
            }
        }

        return positions;
    }

    matchAllRanges(expr: RegExp | string) {
        expr = toRegexGlobal(expr);
        const matches = this.text.matchAll(expr);
        let ranges: [number, number][] = [];

        for (const match of matches) {
            if (match.index !== undefined) {
                ranges.push([match.index, match.index + match[0].length]);
            }
        }

        return ranges;
    }

    matchNext(expr: RegExp | string, position: number = 0) {
        expr = toRegexGlobal(expr);

        // JS strings are immutable, so this shouldn't allocate anything at all. Right?
        const substr = this.text.substring(position);
        const matches = substr.matchAll(expr);
        for (const match of matches) {
            if (match && match.index !== undefined) {
                match.index += position;
            }

            return match;
        }

        return null;
    }

    // this is a cool function, I should document it sometime
    replaceMany(ranges: [number | undefined, number][], strings: string[]) {
        // check for overlapping ranges

        //argsort if strings and ranges are same length, else just normal sort

        if (strings.length === ranges.length) {
            let sorted = true;

            for (let i = 0; i < ranges.length; i++) {
                if (ranges[i - 1] > ranges[i]) {
                    sorted = false;
                }

                if (ranges[i - 1] === ranges[i]) {
                    throw new Error(
                        `Range ${i - 1} : ${ranges[i - 1]} overlaps with ${i} : ${ranges[i]}`
                    );
                }
            }

            if (!sorted) {
                const zippedAndSorted = ranges
                    .map((x, index) => {
                        const res: [[number | undefined, number], string] = [x, strings[index]];
                        return res;
                    })
                    .sort((pairA, pairB) => {
                        const a = pairA[0],
                            b = pairB[0];

                        if (a[0] === b[0]) return 0;
                        if (a[0] === undefined) return -1;
                        if (b[0] === undefined) return -1;

                        return a[0] - b[0];
                    });
                ranges = zippedAndSorted.map((x) => x[0]);
                strings = zippedAndSorted.map((x) => x[1]);
            }
        } else {
            ranges = ranges.sort((a, b) => {
                if (a[0] === b[0]) return 0;
                if (a[0] === undefined) return -1;
                if (b[0] === undefined) return -1;

                return a[0] - b[0];
            });
        }

        for (let i = 1; i < ranges.length; i++) {
            const rangeStart = ranges[i][0];
            if (rangeStart === undefined) continue;

            // check if previous range extends over current range. (inclusive, exclusive)
            if (ranges[i - 1][1] > rangeStart) {
                throw new Error(
                    `Range ${i - 1} : ${ranges[i - 1]} overlaps with ${i} : ${ranges[i]}`
                );
            }
        }

        const stringBuilder: string[] = [];
        let previousIndex = 0;
        let currentDelta = 0;
        const newRanges = new Array<[number, number]>();
        for (const [start, end] of ranges) {
            if (start === undefined) {
                continue;
            }

            newRanges.push([start, end]);
        }

        for (let i = 0; i < ranges.length; i++) {
            const [start, end] = ranges[i];
            if (start === undefined) continue;
            const string = strings[i % strings.length];

            stringBuilder.push(this.text.slice(previousIndex, start));
            stringBuilder.push(string);
            previousIndex = end;

            newRanges[i][0] += currentDelta;
            newRanges[i][1] = newRanges[i][0] + string.length;
            currentDelta += string.length - (end - start);
        }
        stringBuilder.push(this.text.slice(previousIndex));

        this.text = stringBuilder.join("");
        return newRanges;
    }

    insertMany(positions: (number | undefined)[], strings: string[]) {
        let newPositions = new Array<number>();
        for (const pos of positions) {
            if (pos === undefined) continue;

            newPositions.push(pos);
        }

        return this.replaceMany(
            newPositions.map((x) => [x, x!]),
            strings
        ).map((x) => x[0]);
    }

    removeMany(ranges: [number | undefined, number][]) {
        return this.replaceMany(
            ranges,
            ranges.map((x) => "")
        );
    }

    indexAfter(str: string, position: number = 0) {
        const pos = this.text.indexOf(str, position);
        if (pos === -1) return -1;
        return pos + str.length;
    }

    remove(start: number, end: number) {
        this.replace("", start, end);
    }

    insert(str: string, position: number) {
        this.replace(str, position, position);
    }

    replace(str: string, start: number, end: number) {
        this.text = this.text.substring(0, start) + str + this.text.substring(end);
    }

    private reverseStringCompare(str: string, pos: number = 0) {
        if (pos + 1 - str.length < 0) return false;

        for (let i = 0; i < str.length; i++) {
            if (this.text[pos - i] !== str[str.length - 1 - i]) {
                return false;
            }
        }

        return true;
    }

    lastIndexAfter(str: string, position: number = -1) {
        if (position < 0) {
            position = this.text.length + position;
        }

        if (str === "") return -1;

        for (let i = position; i >= 0 - 1; i--) {
            if (this.reverseStringCompare(str, i)) {
                return i + 1;
            }
        }

        return -1;
    }
}
