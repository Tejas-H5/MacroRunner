import * as assert from "assert";
import * as vscode from "vscode";
import EditableFile from "../../editableFile";
import * as macroRunner from "../../extension";
import * as stringUtil from "../../stringUtil";

suite("StringUtilTests", () => {
    const text = `Some sample text for testing the text here`;

    suite("indexAfter", () => {
        test("regular case", () => {
            assert.strictEqual(
                stringUtil.indexAfter(text, "text"),
                text.indexOf("text") + "text".length
            );
        });

        test("with nonzero pos", () => {
            const pos = text.indexOf("test");
            assert.strictEqual(
                stringUtil.indexAfter(text, "testing", pos),
                text.indexOf("testing", pos) + "testing".length
            );
        });

        test("final index", () => {
            assert.strictEqual(stringUtil.indexAfter(text, "here"), text.length);
        });

        test("first index", () => {
            assert.strictEqual(
                stringUtil.indexAfter(text, "Some sample text for"),
                "Some sample text for".length
            );
        });

        test("not found", () => {
            assert.strictEqual(stringUtil.indexAfter(text, "bruh"), -1);
        });
    });

    suite("lastIndexAfter", () => {
        const testLastIndexAfterFoundCase = (str: string, pos: number | undefined = undefined) => {
            assert.strictEqual(
                stringUtil.lastIndexAfter(text, str, pos),
                text.lastIndexOf(str, pos) + str.length
            );
        };

        test("regular case", () => {
            testLastIndexAfterFoundCase("text", text.indexOf("testing"));
        });

        test("overlap", () => {
            assert.strictEqual(
                stringUtil.lastIndexAfter(text, "test", text.indexOf("testing")),
                -1
            );
        });

        test("regular case default parameter", () => {
            testLastIndexAfterFoundCase("test");
        });

        test("first index", () => {
            testLastIndexAfterFoundCase("S");
        });

        test("last index", () => {
            testLastIndexAfterFoundCase("text here");
        });

        test("not found case", () => {
            const pos = text.indexOf("testing");
            assert.strictEqual(stringUtil.lastIndexAfter(text, "testing", pos + 1), -1);
        });
    });

    test("indexAfter logically consistent with lastIndexAfter?", () => {
        const a = stringUtil.lastIndexAfter(text, "testing");
        const b = stringUtil.indexAfter(text, "testing");

        assert.strictEqual(a, b, "=> " + a + ", indexAfter => " + b);
    });

    suite("matchNext", () => {
        test("default parameter", () => {
            assert.strictEqual(stringUtil.matchNext(text, /sample/)?.index, text.indexOf("sample"));
        });

        test("positional", () => {
            const pos = text.indexOf("testing");
            assert.strictEqual(
                stringUtil.matchNext(text, /text/, pos)?.index,
                text.indexOf("text", pos)
            );
        });

        test("not found", () => {
            const pos = text.indexOf("testing");
            assert.strictEqual(stringUtil.matchNext(text, /sample/, pos)?.index, undefined);
        });

        test("iteration", () => {
            let pos = stringUtil.matchNext(text, "Some sample", 0)?.index;
            assert.strictEqual(pos, 0, "1");

            pos = stringUtil.matchNext(text, "text", pos)?.index;

            assert.strictEqual(text.indexOf("text", 0), pos, "2");

            // don't move if we start in the same place
            pos = stringUtil.matchNext(text, "text", pos)?.index;
            assert.strictEqual(text.indexOf("text", 0), pos, "3");

            pos = stringUtil.matchNext(text, / \w+/, pos)?.index;
            assert(pos);
            pos++;

            assert.strictEqual(text.indexOf("for", 0), pos, "4");

            pos = stringUtil.matchNext(text, /here/)?.index;
            assert.strictEqual(text.indexOf("here"), pos, "5");
        });
    });

    suite("replaceMany (and co)", () => {
        test("simple insertMany", () => {
            let text2 = "";
            for (let i = 0; i < 10; i++) {
                text2 += "a ";
            }

            const positions = stringUtil.findAllPositions(text2, /a/).map((x) => x + 1);

            let [newText, newRanges] = stringUtil.insertMany(text2, positions, ["b"]);

            let expectedText = "";
            for (let i = 0; i < 10; i++) {
                expectedText += "ab ";
            }

            assert.strictEqual(newText, expectedText, "wrong text");

            let expectedRanges = [];
            for (let i = 0; i < positions.length; i++) {
                expectedRanges.push([1 + i * 3, 2 + i * 3]);
            }

            assert.deepStrictEqual(newRanges, expectedRanges, "wrong offsets");
        });

        test("simple removeMany", () => {
            let text2 = "";
            for (let i = 0; i < 10; i++) {
                text2 += "a ";
            }

            const ranges = stringUtil.findAllRanges(text2, /a/);
            const [newText, newPositions] = stringUtil.removeMany(text2, ranges);

            let expectedText = "";
            for (let i = 0; i < 10; i++) {
                expectedText += " ";
            }

            assert.strictEqual(newText, expectedText, "wrong text");

            let expectedRanges = [];
            for (let i = 0; i < ranges.length; i++) {
                expectedRanges.push([i, i]);
            }

            assert.deepStrictEqual(newPositions, expectedRanges, "wrong offsets");
        });

        test("simple replaceMany", () => {
            let text2 = "";
            for (let i = 0; i < 10; i++) {
                text2 += "a ";
            }

            const ranges = stringUtil.findAllRanges(text2, /a/);
            let [newText, newRanges] = stringUtil.replaceMany(text2, ranges, ["bbb"]);

            let expectedText = "";
            for (let i = 0; i < 10; i++) {
                expectedText += "bbb ";
            }

            assert.strictEqual(newText, expectedText, "wrong text");

            let expectedRanges = [];
            for (let i = 0; i < ranges.length; i++) {
                expectedRanges.push([i * 4, i * 4 + 3]);
            }

            assert.deepStrictEqual(newRanges, expectedRanges, "wrong offsets");
        });

        test("adjacent ranges", () => {
            const text = "12";
            const [newText, _] = stringUtil.replaceMany(
                text,
                [
                    [0, 1],
                    [1, 2],
                ],
                ["3", "4"]
            );
            assert.strictEqual(newText, "34");
        });

        test("overlapping ranges", () => {
            let text = "12";
            assert.throws(() => {
                let [text2, newRanges] = stringUtil.replaceMany(
                    text,
                    [
                        [0, 2],
                        [1, 2],
                    ],
                    ["3", "4"]
                );

                text = text2;
            });

            assert.throws(() => {
                stringUtil.replaceMany(
                    text,
                    [
                        [0, 1],
                        [0, 2],
                    ],
                    ["3", "4"]
                );
            });
        });

        test("unordered ranges", () => {
            const text = "123";
            const [newText, newRanges] = stringUtil.replaceMany(
                text,
                [
                    [2, 3],
                    [0, 1],
                    [1, 2],
                ],
                ["5", "3", "4"]
            );

            assert.strictEqual(newText, "345");
        });
    });
});
