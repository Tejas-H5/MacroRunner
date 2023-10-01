import * as vscode from "vscode";
import { typeAssertString } from "./typeAssertions";

export const cursed_spinAwait = <T>(promise: Thenable<T>, timeoutMS: number = 5000): T => {
    let isDone = false;
    let resAny: any = null;
    promise.then((res) => {
        resAny = res;
        isDone = true;
    });

    const now = Date.now();
    while (!isDone) {
        if (Date.now() - now > timeoutMS) {
            throw new Error("Timeout for spinlock exceeded");
        }

        continue;
    }

    const trustMeBro: T = resAny;
    return trustMeBro;
};
