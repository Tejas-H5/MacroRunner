import * as vscode from "vscode";
import { typeAssertString } from "./typeAssertions";

export const cursed_spinAwait = <T>(promiseFn: () => Thenable<T>, timeoutMS: number = 5000): T => {
    let isDone = { signal: false };
    let resAny: any = null;
    promiseFn().then((res) => {
        resAny = res;
        isDone.signal = true;
    });

    const now = Date.now();
    while (!isDone.signal) {
        if (Date.now() - now > timeoutMS) {
            throw new Error("Timeout for spinlock exceeded");
        }

        continue;
    }

    const trustMeBro: T = resAny;
    return trustMeBro;
};
