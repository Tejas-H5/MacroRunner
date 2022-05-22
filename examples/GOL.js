// macro : Turns some text into Conway's Game of life
// homework: write a macro that generates a random starting state and
// run that before running this one

let board = [];
const size = 50;

const file = context.getFile();
let existing = file.text.split("\n");

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

const count = (x, y) => {
    const counts = [
        board[y - 1] && board[y - 1][x - 1],
        board[y - 1] && board[y - 1][x],
        board[y - 1] && board[y - 1][x + 1],
        board[y][x - 1],
        board[y][x + 1],
        board[y + 1] && board[y + 1][x - 1],
        board[y + 1] && board[y + 1][x],
        board[y + 1] && board[y + 1][x + 1],
    ];

    let res = 0;
    for (let i = 0; i < counts.length; i++) {
        if (counts[i] && counts[i] !== " ") {
            res += 1;
        }
    }

    return res;
};

loop(
    (counter) => {
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

        file.setText(text);

        [board2, board] = [board, board2];

        context.outputImmediate();
    },
    100,
    50
);
