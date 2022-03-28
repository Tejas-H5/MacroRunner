import * as assert from "assert";
import * as vscode from "vscode";
import * as scriptRunner from "../../extension";

suite("Test mocha config is working", () => {
    test("True===True", () => {
        assert.strictEqual("a", "abc".substring(0, 1));
    });
});
