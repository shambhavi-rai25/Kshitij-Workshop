const difficulties = {
    easy: {
        rows: 9,
        cols: 9,
        mines: 10
    },
    medium: {
        rows: 16,
        cols: 16,
        mines: 40
    },
    hard: {
        rows: 16,
        cols: 30,
        mines: 99
    }
};

const boardElement = document.getElementById("board");
const timerElement = document.getElementById("timer");
const mineCounterElement = document.getElementById("mineCounter");
const difficultySelect = document.getElementById("difficulty");
const newGameBtn = document.getElementById("newGameBtn");
const resetBtn = document.getElementById("resetGameBtn");
const leaderboardList = document.getElementById("leaderboardList");
const statsToggle = document.getElementById("statsToggle");
const leaderboardToggle = document.getElementById("leaderboardToggle");
const sidePanel = document.getElementById("sidePanel");
const sidePanelOverlay = document.getElementById("sidePanelOverlay");
const closePanel = document.getElementById("closePanel");
const statsPanel = document.getElementById("statsPanel");
const leaderboardPanel = document.getElementById("leaderboardPanel");

let board = [];
let rows = 9;
let cols = 9;
let mineCount = 10;

let firstClick = true;
let gameOver = false;
let timer = 0;
let timerInterval = null;

let gameRecorded = false;
let stats = {
    gamesPlayed: 0,
    gamesWon: 0
};
const gamesPlayedElement = document.getElementById("gamesPlayed");
const gamesWonElement = document.getElementById("gamesWon");
const winRateElement = document.getElementById("winRate");
const resetStatsBtn = document.getElementById("resetStatsBtn");

let bestTimes = {
    easy: null,
    medium: null,
    hard: null,
    custom: null
};
let leaderboard = {
    easy: [],
    medium: [],
    hard: [],
    custom: []
};

let focusedRow = 0;
let focusedCol = 0;
let isDifficultySelectorVisible = false;

function createBoard() {
    board = [];
    for(let row = 0; row < rows; row++) {
        const currentRow = [];
        for (let col = 0; col < cols; col++) {
            currentRow.push({
                mine: false,
                revealed: false,
                flagged: false,
                question: false,
                count: 0
            });
        }
        board.push(currentRow);
    }
}

function renderBoard() {
    boardElement.innerHTML = "";
    boardElement.style.gridTemplateColumns =
        `repeat(${cols}, 40px)`;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const button =
                document.createElement("button");

            button.classList.add("cell");
            button.dataset.row = row;
            button.dataset.col = col;

            boardElement.appendChild(button);
        }
    }
}

function initializeGame() {
    firstClick = true;
    gameOver = false;
    gameRecorded = false;
    timer = 0;

    timerElement.textContent = formatTime(timer);

    stopTimer();
    createBoard();
    renderBoard();
    updateBoardDisplay();
    updateMineCounter();
}

function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function loadDifficulty() {
    const selectedDifficulty = difficultySelect.value;

    if (selectedDifficulty === "custom") {
        const customRows = Number(prompt("Enter number of rows (min 5, max 20):", 9));
        const customCols = Number(prompt("Enter number of columns (min 5, max 30):", 9));
        const customMines = Number(prompt("Enter number of mines:", 10));

        const safeRows = Math.min(20, Math.max(5, customRows || 9));
        const safeCols = Math.min(30, Math.max(5, customCols || 9));
        const maxMines = safeRows * safeCols - 1;
        const safeMines = Math.min(maxMines, Math.max(1, customMines || 10));

        rows = safeRows;
        cols = safeCols;
        mineCount = safeMines;
        return;
    }

    rows = difficulties[selectedDifficulty].rows;
    cols = difficulties[selectedDifficulty].cols;
    mineCount = difficulties[selectedDifficulty].mines;
}

newGameBtn.addEventListener("click", () => {
    if (!isDifficultySelectorVisible) {
        difficultySelect.classList.remove("difficulty-hidden");
        isDifficultySelectorVisible = true;
        return;
    }

    loadDifficulty();
    initializeGame();
    difficultySelect.classList.add("difficulty-hidden");
    isDifficultySelectorVisible = false;
});

resetBtn.addEventListener("click", () => {
        initializeGame();
    }
);

function isProtectedCell(row, col, safeRow, safeCol) {
    return (
        Math.abs(row - safeRow) <= 1 &&
        Math.abs(col - safeCol) <= 1
    );
}

function placeMines(safeRow = null, safeCol = null) {
    let minesPlaced = 0;

    while (minesPlaced < mineCount) {
        const randomRow = Math.floor(Math.random() * rows);
        const randomCol = Math.floor(Math.random() * cols);

        if (board[randomRow][randomCol].mine) {
            continue;
        }

        if (
            safeRow !== null &&
            safeCol !== null &&
            isProtectedCell(
                randomRow,
                randomCol,
                safeRow,
                safeCol
            )
        ) {
            continue;
        }

        board[randomRow][randomCol].mine = true;
        minesPlaced++;
    }
}

function printBoardToConsole() {
    console.clear();
 
    for (let row = 0; row < rows; row++) {
        let line = "";
        for (let col = 0; col < cols; col++) {
            if (board[row][col].mine) {
                line += "💣 ";
            } 
            else {
                line +=
                    board[row][col].count + " ";
            }
        }
        console.log(line);
    }
}

function calculateNumbers() {
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            if (board[row][col].mine) {
                continue;
            }
            
            let count = 0;
            for (const [rowOffset, colOffset] of directions) {
                const neighbourRow = row + rowOffset;
                const neighbourCol = col + colOffset;

                if (
                    neighbourRow >= 0 &&
                    neighbourRow < rows &&
                    neighbourCol >= 0 &&
                    neighbourCol < cols
                ) {
                    if (board[neighbourRow][neighbourCol].mine) {
                        count++;
                    }
                }
            }
            board[row][col].count = count;
        }
    }
}

function handleFirstClick(row, col) {
    if (!firstClick) {
        return;
    }

    placeMines(row, col);
    calculateNumbers();
    startTimer();
    firstClick = false;
    printBoardToConsole();
}

boardElement.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        if (gameOver) {
            return;
        }

        const button = event.target.closest(".cell");

        if (!button) {
            return;
        }

        const row = Number(button.dataset.row);
        const col = Number(button.dataset.col);
        toggleMark(row, col);
    }
);

resetStatsBtn.addEventListener("click", () => {
        const confirmed = confirm( "Reset all statistics?");

        if (!confirmed) {
            return;
        }
        stats = {
            gamesPlayed: 0,
            gamesWon: 0
        };
        saveStats();
        updateStatsDisplay();
    }
);

const directions = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1]
];

function updateBoardDisplay() {
    const buttons = document.querySelectorAll(".cell");

    buttons.forEach(button => {
        const row = Number(button.dataset.row);
        const col = Number(button.dataset.col);
        const cell = board[row][col];

        button.textContent = "";
        button.className = "cell";
        button.style.outline = "";

        if (cell.revealed) {
            button.classList.add("revealed");

            if (cell.mine) {
                button.textContent = "💣";
                button.classList.add("mine");
                if (cell.flagged) {
                    button.classList.add("correct-flag");
                }
            } else if (cell.count > 0) {
                button.textContent = cell.count;
                button.classList.add(`n${cell.count}`);
            }
        } else if (cell.flagged) {
            if (gameOver && !cell.mine) {
                button.textContent = "✖";
                button.classList.add("wrong-flag");
            } else {
                button.textContent = "🚩";
                button.classList.add("flagged");
            }
        } else if (cell.question) {
            button.textContent = "❓";
            button.classList.add("question");
        }

        if (row === focusedRow && col === focusedCol) {
            button.style.outline = "2px solid orange";
        }
    });
}

function floodFill(startRow, startCol) {
    const queue = [];
    queue.push([startRow, startCol]);

    while (queue.length > 0) {
        const [row, col] = queue.shift();
        const cell = board[row][col];

        if (cell.revealed) {
            continue;
        }
        if (cell.flagged) {
            continue;
        }

        cell.revealed = true;

        if (cell.count !== 0) {
            continue;
        }
        for (const [rowOffset, colOffset] of directions) {
            const neighbourRow = row + rowOffset;
            const neighbourCol = col + colOffset;

            if (
                neighbourRow >= 0 &&
                neighbourRow < rows &&
                neighbourCol >= 0 &&
                neighbourCol < cols
            ) {
                const neighbourCell =
                    board[neighbourRow][neighbourCol];

                if (
                    !neighbourCell.revealed &&
                    !neighbourCell.mine
                ) {
                    queue.push([
                        neighbourRow,
                        neighbourCol
                    ]);
                }
            }
        }
    }
}

function revealCell(row, col) {
    const cell = board[row][col];

    if (cell.revealed) {
        return;
    }
    if (cell.flagged) {
        return;
    }
    if (cell.mine) {
        triggerGameOver();
        return;
    }

    if (cell.count === 0) {
        floodFill(row, col);
    } 
    else {
        cell.revealed = true;
    }

    updateBoardDisplay();
    checkWin();
}

function toggleMark(row, col) {
    const cell = board[row][col];
    if (cell.revealed) {
        return;
    }

    if (!cell.flagged && !cell.question) {
        cell.flagged = true;
    } 
    else if (cell.flagged) {
        cell.flagged = false;
        cell.question = true;
    } 
    else {
        cell.question = false;
    }

    updateMineCounter();
    updateBoardDisplay();
}

function updateMineCounter() {
    let flagsPlaced = 0;
   
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            if (board[row][col].flagged) {
                flagsPlaced++;
            }
        }
    }
    mineCounterElement.textContent = mineCount - flagsPlaced;
}

function triggerGameOver() {
    gameOver = true;
    stopTimer();
    recordGame(false);
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            if (board[row][col].mine) {
                board[row][col].revealed = true;
            }
        }
    }
    updateBoardDisplay();
    alert("Game Over!");
}

function checkWin() {
    let revealedCells = 0;
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            if (board[row][col].revealed) {
                revealedCells++;
            }
        }
    }
    const requiredReveals = (rows * cols) - mineCount;
    if (revealedCells === requiredReveals) {
        gameOver = true;
        stopTimer();
        recordGame(true);
        updateScoresOnWin(timer, difficultySelect.value);
        alert("🎉 You Win!");
    }
}

function startTimer() {
    if (timerInterval) {
        return;
    }

    timerInterval = setInterval(() => {
        timer++;
        timerElement.textContent = formatTime(timer);
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
}

function loadStats() {
    const savedStats = localStorage.getItem("stats");
    
    if (savedStats) {
        stats = JSON.parse(savedStats);
    }
    updateStatsDisplay();
}

function saveStats() {
    localStorage.setItem("stats",JSON.stringify(stats));
}

function updateStatsDisplay() {
    gamesPlayedElement.textContent = stats.gamesPlayed;
    gamesWonElement.textContent = stats.gamesWon;
    let winRate = 0;

    if (stats.gamesPlayed > 0) {
        winRate =
            (
                stats.gamesWon /
                stats.gamesPlayed
            ) * 100;
    }
    winRateElement.textContent = `${winRate.toFixed(2)}%`;
}



function recordGame(won) {
    if (gameRecorded) {
        return;
    }
    gameRecorded = true;
    stats.gamesPlayed++;

    if (won) {
        stats.gamesWon++;
    }
    saveStats();
    updateStatsDisplay();
}

function loadLeaderboard() {

    const savedBest =
        localStorage.getItem("bestTimes");

    const savedBoard =
        localStorage.getItem("leaderboard");

    if (savedBest) {
        bestTimes = JSON.parse(savedBest);
    }

    if (savedBoard) {
        leaderboard = JSON.parse(savedBoard);
    }

    updateLeaderboardUI();
}

function saveLeaderboard() {

    localStorage.setItem(
        "bestTimes",
        JSON.stringify(bestTimes)
    );

    localStorage.setItem(
        "leaderboard",
        JSON.stringify(leaderboard)
    );
}

function updateScoresOnWin(time, difficulty) {

    // 1. Update leaderboard array
    leaderboard[difficulty].push(time);

    // 2. Sort fastest first
    leaderboard[difficulty].sort((a, b) => a - b);

    // 3. Keep only top 3
    leaderboard[difficulty] =
        leaderboard[difficulty].slice(0, 3);

    // 4. Update best time
    if (
        bestTimes[difficulty] === null ||
        time < bestTimes[difficulty]
    ) {
        bestTimes[difficulty] = time;
    }

    saveLeaderboard();
    updateLeaderboardUI();
}

function updateLeaderboardUI() {

    leaderboardList.innerHTML = "";

    const difficulty =
        difficultySelect.value;

    const scores =
        leaderboard[difficulty];

    const best =
        bestTimes[difficulty];

    const bestLine =
        document.createElement("li");

    bestLine.textContent =
        `Best Time: ${best ?? "-"}`;

    leaderboardList.appendChild(bestLine);

    scores.forEach((time, index) => {

        const li =
            document.createElement("li");

        li.textContent =
            `#${index + 1} — ${time}s`;

        leaderboardList.appendChild(li);
    });
}

difficultySelect.addEventListener("change", () => {
    updateLeaderboardUI();
});

document.addEventListener("keydown", (e) => {

    if (gameOver) return;

    switch (e.key) {

        case "ArrowUp":
            focusedRow = Math.max(0, focusedRow - 1);
            break;

        case "ArrowDown":
            focusedRow = Math.min(rows - 1, focusedRow + 1);
            break;

        case "ArrowLeft":
            focusedCol = Math.max(0, focusedCol - 1);
            break;

        case "ArrowRight":
            focusedCol = Math.min(cols - 1, focusedCol + 1);
            break;

        case "Enter":
            handleFirstClick(focusedRow, focusedCol);
            revealCell(focusedRow, focusedCol);
            break;

        case " ":
            toggleMark(focusedRow, focusedCol);
            break;
    }

    updateBoardDisplay();
});

function getFlagCount(row, col) {

    let count = 0;

    for (const [dr, dc] of directions) {

        const nr = row + dr;
        const nc = col + dc;

        if (
            nr >= 0 &&
            nr < rows &&
            nc >= 0 &&
            nc < cols &&
            board[nr][nc].flagged
        ) {
            count++;
        }
    }

    return count;
}

function revealNeighbors(row, col) {

    for (const [dr, dc] of directions) {

        const nr = row + dr;
        const nc = col + dc;

        if (
            nr >= 0 &&
            nr < rows &&
            nc >= 0 &&
            nc < cols
        ) {
            revealCell(nr, nc);
        }
    }
}

boardElement.addEventListener("click", (event) => {

    const button = event.target.closest(".cell");
    if (!button || gameOver) return;

    const row = Number(button.dataset.row);
    const col = Number(button.dataset.col);

    handleFirstClick(row, col);

    const cell = board[row][col];

    if (cell.revealed && cell.count > 0) {

        const flags = getFlagCount(row, col);

        if (flags === cell.count) {
            revealNeighbors(row, col);
            updateBoardDisplay();
            checkWin();
            return;
        }
    }

    revealCell(row, col);
    updateBoardDisplay();
    checkWin();
});

function openPanel(panelName) {
    sidePanel.classList.add("open");
    sidePanelOverlay.style.display = "block";

    statsPanel.classList.remove("active");
    leaderboardPanel.classList.remove("active");

    if (panelName === "stats") {
        statsPanel.classList.add("active");
    } else {
        leaderboardPanel.classList.add("active");
    }
}

function closeSidePanel() {
    sidePanel.classList.remove("open");
    sidePanelOverlay.style.display = "none";
}

statsToggle.addEventListener("click", () => openPanel("stats"));
leaderboardToggle.addEventListener("click", () => openPanel("leaderboard"));
closePanel.addEventListener("click", closeSidePanel);
sidePanelOverlay.addEventListener("click", closeSidePanel);

loadStats();
loadLeaderboard();
initializeGame();