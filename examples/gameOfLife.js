// macro v2 : Turns some text into Conway's Game of life. A demo of macro cancellation, applyChangesImmediately, and sleep

// Entire macro-runner API
const {
    // frequently used functions
    getText, // () => string - Gets all text from the adjacent file.
    setText, // (string) => void - Updates all text in the adjacent file (after macro has finished running)

    // animations
    sleep, // async (milliseconds: number) => Promise<void> - await this function to sleep for some ms. It was easier for me to code than the timeout/interval functions
    applyChangesImmediately, // async (shouldAddUndoPoint: boolean) => Promise<void> - blits all changes to the active file immediately, before the macro has completed. Used to add intermediate undo-stops by setting shouldAddUndoPoint=true.
    isCancelled // () => boolean - use isCancelled() to check if a cancel signal has been sent to the macro. Currently the only way to mitigate infinte loops other than Task manager
} = context;

let board = [];
const size = 50;

let existing = getText().split("\n");

for (let i = 0; i < size; i++) {
    board[i] = [];
    for (let j = 0; j < size; j++) {
        if (i >= existing.length) {
            break;
        }

        let c1 = existing[i][j * 2];
        let c2 = existing[i][j * 2 + 1];

        if (c1 && c1 !== " " && c2 && c2 !== " ") {
            board[i].push("*");
        } else {
            board[i].push(" ");
        }
    }
}

let board2 = [];

for (let i = 0; i < size; i++) {
    board2[i] = [];
    for (let j = 0; j < size; j++) {
        board2[i].push(Math.random() > 0.5 ? " " : "*");
    }
}

const isAlive = (y, x) => {
    return board[y] && board[y][x] && board[y][x] !== " ";
};

const count = (x, y) => {
    let res = 0;
    if (isAlive(y - 1, x - 1)) res++;
    if (isAlive(y, x - 1)) res++;
    if (isAlive(y + 1, x - 1)) res++;
    if (isAlive(y + 1, x)) res++;
    if (isAlive(y + 1, x + 1)) res++;
    if (isAlive(y, x + 1)) res++;
    if (isAlive(y - 1, x + 1)) res++;
    if (isAlive(y - 1, x)) res++;

    return res;
};

// Terminate this loop by sending a cancellation signal to the macro
// via the > Cancel signal to running macros (Macro Runner) command
while (!isCancelled()) {
    let text = "";
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            let s = count(i, j);
            if (board[j][i] === " " && s === 3) {
                board2[j][i] = s;
            } else if (board[j][i] !== " " && (s < 2 || s > 3)) {
                board2[j][i] = " ";
            } else {
                board2[j][i] = board[j][i];
            }
        }
    }

    text += board.map((x) => x.map((y) => (y === " " ? "  " : "<>")).join("")).join("\n");
    [board2, board] = [board, board2];

    setText(text);
    applyChangesImmediately(false);

    await sleep(100); // don't forget the `await` here, otherwise you will have to end this loop with Task manager
}
