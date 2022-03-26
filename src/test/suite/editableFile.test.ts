import * as assert from "assert";
import * as vscode from "vscode";
import EditableFile from "../../editableFile";
import * as macroRunner from "../../extension";

suite("EditableFile", () => {
    const file = new EditableFile(`Some sample text for testing the text here`);
    suite("indexAfter", () => {
        test("regular case", () => {
            assert.strictEqual(
                file.indexAfter("text"),
                file.getText().indexOf("text") + "text".length
            );
        });

        test("with nonzero pos", () => {
            const pos = file.getText().indexOf("test");
            assert.strictEqual(
                file.indexAfter("testing", pos),
                file.getText().indexOf("testing", pos) + "testing".length
            );
        });

        test("final index", () => {
            assert.strictEqual(file.indexAfter("here"), file.getText().length);
        });

        test("first index", () => {
            assert.strictEqual(
                file.indexAfter("Some sample text for"),
                "Some sample text for".length
            );
        });

        test("not found", () => {
            assert.strictEqual(file.indexAfter("bruh"), -1);
        });
    });

    suite("lastIndexAfter", () => {
        const testLastIndexAfterFoundCase = (str: string, pos: number | undefined = undefined) => {
            assert.strictEqual(
                file.lastIndexAfter(str, pos),
                file.getText().lastIndexOf(str, pos) + str.length
            );
        };

        test("regular case", () => {
            testLastIndexAfterFoundCase("text", file.getText().indexOf("testing"));
        });

        test("overlap", () => {
            assert.strictEqual(file.lastIndexAfter("test", file.getText().indexOf("testing")), -1);
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
            const pos = file.getText().indexOf("testing");
            assert.strictEqual(file.lastIndexAfter("testing", pos + 1), -1);
        });
    });

    test("indexAfter logically consistent with lastIndexAfter?", () => {
        const a = file.lastIndexAfter("testing");
        const b = file.indexAfter("testing");

        assert.strictEqual(a, b, "=> " + a + ", indexAfter => " + b);
    });

    suite("matchNext", () => {
        test("default parameter", () => {
            assert.strictEqual(file.matchNext(/sample/)?.index, file.getText().indexOf("sample"));
        });

        test("positional", () => {
            const pos = file.getText().indexOf("testing");
            assert.strictEqual(
                file.matchNext(/text/, pos)?.index,
                file.getText().indexOf("text", pos)
            );
        });

        test("not found", () => {
            const pos = file.getText().indexOf("testing");
            assert.strictEqual(file.matchNext(/sample/, pos)?.index, undefined);
        });

        test("iteration", () => {
            let pos = file.matchNext("Some sample", 0)?.index;
            assert.strictEqual(pos, 0, "1");

            pos = file.matchNext("text", pos)?.index;

            assert.strictEqual(file.getText().indexOf("text", 0), pos, "2");

            // don't move if we start in the same place
            pos = file.matchNext("text", pos)?.index;
            assert.strictEqual(file.getText().indexOf("text", 0), pos, "3");

            pos = file.matchNext(/ \w+/, pos)?.index;
            assert(pos);
            pos++;

            assert.strictEqual(file.getText().indexOf("for", 0), pos, "4");

            pos = file.matchNext(/here/)?.index;
            assert.strictEqual(file.getText().indexOf("here"), pos, "5");
        });
    });

    suite("batchReplace (and co)", () => {
        test("simple batchInsert", () => {
            const file = new EditableFile("");
            for (let i = 0; i < 10; i++) {
                file.setText(file.getText() + "a ");
            }

            const positions = file.matchAllArrayPositions(/a/).map((x) => x + 1);

            let newPositions = file.batchInsert(positions, ["b"]);

            let expectedText = "";
            for (let i = 0; i < 10; i++) {
                expectedText += "ab ";
            }

            assert.strictEqual(file.getText(), expectedText, "wrong text");

            let expectedPositions = [];
            for (let i = 0; i < positions.length; i++) {
                expectedPositions.push(1 + i * 3);
            }

            assert.deepStrictEqual(newPositions, expectedPositions, "wrong offsets");
        });

        test("simple batchRemove", () => {
            const file = new EditableFile("");
            for (let i = 0; i < 10; i++) {
                file.setText(file.getText() + "a ");
            }

            const ranges = file.matchAllArrayRanges(/a/);
            let newPositions = file.batchRemove(ranges);

            let expectedText = "";
            for (let i = 0; i < 10; i++) {
                expectedText += " ";
            }

            assert.strictEqual(file.getText(), expectedText, "wrong text");

            let expectedRanges = [];
            for (let i = 0; i < ranges.length; i++) {
                expectedRanges.push([i, i]);
            }

            assert.deepStrictEqual(newPositions, expectedRanges, "wrong offsets");
        });

        test("simple batchReplace", () => {
            const file = new EditableFile("");
            for (let i = 0; i < 10; i++) {
                file.setText(file.getText() + "a ");
            }

            const ranges = file.matchAllArrayRanges(/a/);
            let newRanges = file.batchReplace(ranges, ["bbb"]);

            let expectedText = "";
            for (let i = 0; i < 10; i++) {
                expectedText += "bbb ";
            }

            assert.strictEqual(file.getText(), expectedText, "wrong text");

            let expectedRanges = [];
            for (let i = 0; i < ranges.length; i++) {
                expectedRanges.push([i * 4, i * 4 + 3]);
            }

            assert.deepStrictEqual(newRanges, expectedRanges, "wrong offsets");
        });

        test("adjacent ranges", () => {
            const file = new EditableFile("12");
            file.batchReplace(
                [
                    [0, 1],
                    [1, 2],
                ],
                ["3", "4"]
            );
            assert.strictEqual(file.getText(), "34");
        });

        test("overlapping ranges", () => {
            const file = new EditableFile("12");
            assert.throws(() => {
                file.batchReplace(
                    [
                        [0, 2],
                        [1, 2],
                    ],
                    ["3", "4"]
                );
            });

            assert.throws(() => {
                file.batchReplace(
                    [
                        [0, 1],
                        [0, 2],
                    ],
                    ["3", "4"]
                );
            });
        });

        test("unordered ranges", () => {
            const file = new EditableFile("123");
            file.batchReplace(
                [
                    [2, 3],
                    [0, 1],
                    [1, 2],
                ],
                ["5", "3", "4"]
            );

            assert.strictEqual(file.getText(), "345");
        });
    });
});
