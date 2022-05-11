const reverseStringCompare = (text: string, str: string, pos: number = 0) => {
    if (pos + 1 - str.length < 0) return false;

    for (let i = 0; i < str.length; i++) {
        if (text[pos - i] !== str[str.length - 1 - i]) {
            return false;
        }
    }

    return true;
};

const toRegexGlobal = (expr: any) => {
    if (expr instanceof RegExp) {
        let flags = expr.flags;
        if (flags.indexOf("g") === -1) {
            flags += "g";
        }
        return new RegExp(expr, flags);
    } else if (typeof expr === "string" || String instanceof expr) {
        return new RegExp(expr, "g");
    }

    throw new Error(expr.toString() + " isn't a regex or string.");
};

export const findAll = (text: string, expr: RegExp | string) => {
    expr = toRegexGlobal(expr);
    return Array.from(text.matchAll(expr));
};

export const findAllPositions = (text: string, expr: RegExp | string) => {
    expr = toRegexGlobal(expr);
    const matches = text.matchAll(expr);
    let positions: number[] = [];

    for (const match of matches) {
        if (match.index !== undefined) {
            positions.push(match.index);
        }
    }

    return positions;
};

export const findAllRanges = (text: string, expr: RegExp | string) => {
    expr = toRegexGlobal(expr);
    const matches = text.matchAll(expr);
    let ranges: [number, number][] = [];

    for (const match of matches) {
        if (match.index !== undefined) {
            ranges.push([match.index, match.index + match[0].length]);
        }
    }

    return ranges;
};

export const matchNext = (text: string, expr: RegExp | string, position: number = 0) => {
    expr = toRegexGlobal(expr);

    // JS strings are immutable, so shouldn't allocate anything at all. Right?
    const substr = text.substring(position);
    const matches = substr.matchAll(expr);
    for (const match of matches) {
        if (match && match.index !== undefined) {
            match.index += position;
        }

        return match;
    }

    return null;
};

// is a cool function, I should document it sometime
export const replaceMany = (
    text: string,
    ranges: [number | undefined, number][],
    strings: string[] | string
): [string, [number, number][]] => {
    if (typeof strings === "string") {
        strings = [strings];
    }

    // check for overlapping ranges

    // when num strings === num ranges, we want each range to correspond to each string,
    // else we don't need to care about this.
    // so argsort if strings and ranges are same length, else just normal sort.
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
            throw new Error(`Range ${i - 1} : ${ranges[i - 1]} overlaps with ${i} : ${ranges[i]}`);
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

        stringBuilder.push(text.slice(previousIndex, start));
        stringBuilder.push(string);
        previousIndex = end;

        newRanges[i][0] += currentDelta;
        newRanges[i][1] = newRanges[i][0] + string.length;
        currentDelta += string.length - (end - start);
    }
    stringBuilder.push(text.slice(previousIndex));

    text = stringBuilder.join("");

    return [text, newRanges];
};

export const insertMany = (text: string, positions: (number | undefined)[], strings: string[]) => {
    let newPositions = new Array<number>();
    for (const pos of positions) {
        if (pos === undefined) continue;

        newPositions.push(pos);
    }

    return replaceMany(
        text,
        newPositions.map((x) => [x, x!]),
        strings
    );
};

export const removeMany = (text: string, ranges: [number | undefined, number][]) => {
    return replaceMany(
        text,
        ranges,
        ranges.map((x) => "")
    );
};

export const remove = (text: string, start: number, end: number): string => {
    return replace(text, "", start, end);
};

export const insert = (text: string, str: string, position: number) => {
    return replace(text, str, position, position);
};

export const replace = (text: string, str: string, start: number, end: number): string => {
    return text.substring(0, start) + str + text.substring(end);
};

export const indexAfter = (text: string, str: string, position: number = 0) => {
    const pos = text.indexOf(str, position);
    if (pos === -1) return -1;
    return pos + str.length;
};

export const lastIndexAfter = (text: string, str: string, position: number = -1) => {
    if (position < 0) {
        position = text.length + position;
    }

    if (str === "") return -1;

    for (let i = position; i >= 0 - 1; i--) {
        if (reverseStringCompare(text, str, i)) {
            return i + 1;
        }
    }

    return -1;
};

export const first = (ranges: [number, number][]) => {
    return ranges.map((x) => x[0]);
};

export const second = (ranges: [number, number][]) => {
    return ranges.map((x) => x[1]);
};

export const stringUtilFunctions = [
    findAll,
    findAllPositions,
    findAllRanges,
    matchNext,
    replaceMany,
    insertMany,
    removeMany,
    remove,
    insert,
    replace,
    indexAfter,
    lastIndexAfter,
    first,
    second,
];
