import * as assert from "assert";
import * as vscode from "vscode";
import EditableFile from "../../editableFile";
import * as macroRunner from "../../extension";

suite("Test EditableFile API", () => {
    const file = new EditableFile(`Some sample text for testing the text here`);

    test("indexAfter regular case", () => {
        assert.strictEqual(file.indexAfter("text"), file.getText().indexOf("text") + "text".length);
    });

    test("indexAfter with nonzero pos", () => {
        const pos = file.getText().indexOf("test");
        assert.strictEqual(
            file.indexAfter("testing", pos),
            file.getText().indexOf("testing", pos) + "testing".length
        );
    });

    test("indexAfter final index", () => {
        assert.strictEqual(file.indexAfter("here"), file.getText().length);
    });

    test("indexAfter first index", () => {
        assert.strictEqual(file.indexAfter("Some sample text for"), "Some sample text for".length);
    });

    test("indexAfter not found", () => {
        assert.strictEqual(file.indexAfter("bruh"), -1);
    });

    const testLastIndexAfterFoundCase = (str: string, pos: number | undefined = undefined) => {
        assert.strictEqual(
            file.lastIndexAfter(str, pos),
            file.getText().lastIndexOf(str, pos) + str.length
        );
    };

    test("lastIndexAfter regular case", () => {
        testLastIndexAfterFoundCase("text", file.getText().indexOf("testing"));
    });

    test("lastIndexAfter overlap", () => {
        assert.strictEqual(file.lastIndexAfter("test", file.getText().indexOf("testing")), -1);
    });

    test("lastIndexAfter regular case default parameter", () => {
        testLastIndexAfterFoundCase("test");
    });

    test("lastIndexAfter first index", () => {
        testLastIndexAfterFoundCase("S");
    });

    test("lastIndexAfter last index", () => {
        testLastIndexAfterFoundCase("text here");
    });

    test("lastIndexAfter not found case", () => {
        const pos = file.getText().indexOf("testing");
        assert.strictEqual(file.lastIndexAfter("testing", pos + 1), -1);
    });

    test("lastIndexAfter indexAfter logically consistent?", () => {
        const a = file.lastIndexAfter("testing");
        const b = file.indexAfter("testing");

        assert.strictEqual(a, b, "lastIndexAfter => " + a + ", indexAfter => " + b);
    });
});
