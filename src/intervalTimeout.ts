import * as vscode from "vscode";
import { showErrors } from "./macroUtil";

const [setIntervalReal, clearIntervalReal, setTimeoutReal, clearTimeoutReal] = [
    setInterval,
    clearInterval,
    setTimeout,
    clearTimeout,
];

export const createIntervalTimeoutFunctions = () => {
    const timerStore = {
        timers: new Array<NodeJS.Timeout>(),
    };

    const setInterval = (callback: (...args: any[]) => void, milliseconds: number | undefined) => {
        const timeout = setIntervalReal(() => {
            try {
                callback();
            } catch (err: any) {
                showErrors(err);
            }
        }, milliseconds);
        timerStore.timers.push(timeout);
        return timeout;
    };

    const clearInterval = (timeoutId: NodeJS.Timeout) => {
        clearIntervalReal(timeoutId);
        timerStore.timers.splice(timerStore.timers.indexOf(timeoutId), 1);
    };

    const setTimeout = (callback: (...args: any[]) => void, milliseconds: number | undefined) => {
        const timeout = setTimeoutReal(() => {
            try {
                callback();
            } catch (e) {
                showErrors(e);
            }
        }, milliseconds);
        timerStore.timers.push(timeout);
        return timeout;
    };

    const clearTimeout = (timeoutId: NodeJS.Timeout) => {
        clearTimeoutReal(timeoutId);
        timerStore.timers.splice(timerStore.timers.indexOf(timeoutId), 1);
    };

    const joinAll = () => {
        const self = timerStore;
        return new Promise<void>((resolve) => {
            const interval = setIntervalReal(() => {
                if (self.timers.length === 0) {
                    clearIntervalReal(interval);
                    resolve();
                }
            }, 500);
        });
    };

    const loop = (
        callback: (i: number) => boolean,
        interval: number | undefined,
        count: number | undefined
    ) => {
        let counter = 0;
        let intervalId = setInterval(() => {
            try {
                if (callback(counter) || (count !== undefined && counter > count)) {
                    clearInterval(intervalId);
                    return;
                }
                counter++;
            } catch (err: any) {
                clearInterval(intervalId);
                showErrors(err);
            }
        }, interval);
    };

    return {
        functions: [setInterval, setTimeout, clearInterval, clearTimeout, loop],
        joinAll: joinAll,
    };
};
