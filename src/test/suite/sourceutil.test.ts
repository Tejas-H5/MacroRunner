import * as assert from "assert";
import * as vscode from "vscode";
import * as scriptRunner from "../../extension";
import { containsWhileLoop } from "../../sourceUtil";

suite("containsWhileLoop", () => {
    test("while loop", () => {
        assert(
            containsWhileLoop(`        
while(array[4][5][6][7].eightySix[99][\`bruh\`] === "xd") {

} 
        `)
        );
    });

    test("while loop 2", () => {
        assert(
            containsWhileLoop(`        
            while(true.x.y.z) {

            } 
        `)
        );
    });

    test("ignore regex", () => {
        assert(
            !containsWhileLoop(`
        /while while hwile while while/
        
        /while/
        `)
        );
    });

    test("ignore strings", () => {
        assert(
            !containsWhileLoop(`
        'while while hwile while while'
        "while while hwile while while"        
        \`while while hwile while while\`
        `)
        );
    });

    test("ignore comments", () => {
        assert(
            !containsWhileLoop(`
        // while while hwile while while
        /*
        * while while hwile while while
        * while while hwile while while
        * ** ";\\\`  */"        
        `)
        );
    });

    test("ignore variable names", () => {
        assert(
            !containsWhileLoop(`
        let whileStillSearching = true;
        let shouldDoWhile = () => {

        }
        let function dowhile(x) {

        }
        `)
        );
    });
});
