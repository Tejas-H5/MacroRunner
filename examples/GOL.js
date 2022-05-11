// macro : Conway's Game of life

let board = [];
const size = 50;

const file = context.getFile();

for (let i = 0; i < size; i++) {
    board[i] = [];
    for (let j = 0; j < size; j++) {
        board[i].push(Math.random() > 0.5 ? " " : "*");
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
    const res = [
        board[y - 1] && board[y - 1][x - 1],
        board[y - 1] && board[y - 1][x],
        board[y - 1] && board[y - 1][x + 1],
        board[y][x - 1],
        board[y][x + 1],
        board[y + 1] && board[y + 1][x - 1],
        board[y + 1] && board[y + 1][x],
        board[y + 1] && board[y + 1][x + 1],
    ].reduce((prev, curr) => (curr && curr !== " " ? prev + 1 : prev), 0);

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
    300,
    100
);
