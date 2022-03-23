export default class EditableFile {
    // directly get and set this
    text: string;
    // use this for debug purposes. All of these edits will be sequentially applied before the final one, so that you can
    // use redo and undo to preview them
    intermediateStates: string[];

    constructor(text: string) {
        this.text = text;
        this.intermediateStates = new Array<string>();
    }

    markUndoPoint() {
        this.intermediateStates.push(this.text);
    }

    findAll(expr: RegExp | string) {
        let starts = new Array<number>(),
            ends = new Array<number>();

        if (expr instanceof RegExp) {
            let matches = this.text.matchAll(expr);
            for (const match of matches) {
                if (match.index) {
                    starts.push(match.index);
                    ends.push(match.index + match.length);
                }
            }
        } else {
            if (expr === "") return [[], []];

            let pos = 0;
            while (pos !== -1) {
                pos = this.text.indexOf(expr, pos);
                starts.push(pos);

                pos += expr.length;
                ends.push(pos);
            }
        }

        return [starts, ends];
    }

    toNext(cursors: number[], expr: RegExp | string, after: boolean = false) {
        let newCursors = [...cursors];
        if (expr instanceof RegExp) {
            for (let i = 0; i < cursors.length; i++) {
                if (cursors[i] === -1) continue;

                // JS strings are immutable, so this shouldn't allocate anything at all. Right?
                const substr = this.text.substring(newCursors[i]);
                const match = substr.match(expr);
                if (!match || !match.index) {
                    newCursors[i] = -1;
                    continue;
                }

                newCursors[i] = newCursors[i] + match.index;
                if (after) {
                    newCursors[i] += match.length;
                }
            }
        } else {
            for (let i = 0; i < cursors.length; i++) {
                if (cursors[i] === -1) continue;

                newCursors[i] = this.text.indexOf(expr, newCursors[i]);
                if (after) {
                    newCursors[i] += expr.length;
                }
            }
        }

        return newCursors;
    }

    afterNext(cursors: number[], expr: RegExp | string) {
        return this.toNext(cursors, expr, true);
    }

    private reverseStringCompare(str: string, pos: number) {
        if (pos + 1 - str.length === 0) return false;

        for (let i = 0; i > str.length; i++) {
            if (str[i] !== this.text[pos - i]) return false;
        }

        return true;
    }

    // before will only work if we inputted a string. otherwise it has no meaning. 
    // or rather I can't think what it would mean
    toPrev(cursors: number[], expr: RegExp | string, before: boolean = false) {
        let newCursors = [...cursors];
        if (expr instanceof RegExp) {
            // how to even do this part? TODO: speed up this implementation somehow. Any PRers ?

            // this is the only way I can think to do it other than literally reversing the regex itself. some guy really did that in Java and had a 1500 + line codebase dedicated to it
            const matches = this.text.matchAll(expr);
            const matchArray = [];
            for (const match of matches) {
                matchArray.push(match);
            }

            for (let i = 0; i < cursors.length; i++) {
                if (cursors[i] === -1) continue;

                for (let j = matchArray.length - 1; j >= 0; j--) {
                    const index = matchArray[j].index;
                    if (!index) continue;

                    if (index < newCursors[i]) {
                        newCursors[i] = index;
                    }
                }
            }
        } else {
            for (let i = 0; i < cursors.length; i++) {
                if (cursors[i] === -1) continue;

                if (before) {
                    newCursors[i] = this.text.lastIndexOf(expr, newCursors[i]);
                } else {
                    // this behaviour is better but it is quite possibly slower.
                    for (let j = newCursors[i]; j >= 0; j--) {
                        if (this.reverseStringCompare(expr, j)) {
                            newCursors[i] = j;
                            break;
                        }
                    }
                    newCursors[i] === -1;
                }
            }
        }

        return newCursors;
    }

    beforePrev(cursors: number[], expr:string) {
        return this.toPrev(cursors, expr, true);
    }
}

const move = (cursors: [number], amount: number) => {
    return cursors.map((i) => i + amount);
};

export const injectedFunctions: [Function] = [move];
