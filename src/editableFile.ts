import { assertString } from "./sourceUtil";
export default class EditableFile {
    text: string;
    intermediateStates: string[];

    selectedRanges: ([number, number] | null)[];

    constructor(text: string) {
        this.text = text;
        this.intermediateStates = new Array<string>();
        this.selectedRanges = new Array<[number, number]>();
    }

    setText(newText: string) {
        assertString(newText);
        this.text = newText;
    }

    markUndoPoint() {
        this.intermediateStates.push(this.text);
    }
}
