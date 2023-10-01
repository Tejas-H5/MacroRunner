import * as assert from "assert";
import * as vscode from "vscode";
import * as macroRunner from "../../extension";

suite("Test mocha config is working", () => {
    test("true === true", () => {
        assert.strictEqual("a", "abc".substring(0, 1));
    });
});
