(() => {
  'use strict';

  const modeSelect = document.getElementById('mode-select');
  const difficultySelect = document.getElementById('difficulty-select');
  const symbolSelect = document.getElementById('symbol-select');
  const undoBtn = document.getElementById('undo-btn');
  const restartBtn = document.getElementById('restart-btn');
  const resetBtn = document.getElementById('reset-btn');
  const statusDisplay = document.getElementById('status-display');
  const scoreXDisplay = document.getElementById('score-x');
  const scoreODisplay = document.getElementById('score-o');
  const scoreDrawDisplay = document.getElementById('score-draw');
  const board = document.getElementById('board');
  const cells = Array.from(document.querySelectorAll('[data-cell]'));

  /* Game variables */
  const X = 'X', O = 'O';
  let boardState = Array(9).fill('');
  let currentPlayer = X;
  let playerSymbol = X;
  let cpuSymbol = O;
  let gameMode = 'pvp';
  let difficulty = 'medium';
  let moveHistory = [];
  let gameActive = false;
  let scores = {X: 0, O: 0, draw: 0};

  /* Audio Elements */
  const soundMove = document.getElementById('sound-move');
  const soundWin = document.getElementById('sound-win');
  const soundDraw = document.getElementById('sound-draw');
  const soundUndo = document.getElementById('sound-undo');
  const soundTick = document.getElementById('sound-tick');
  const soundTimeout = document.getElementById('sound-timeout');

  /* AI minimax */
  const winCombos = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];

  function checkWin(player) {
    return winCombos.some(combo => combo.every(i => boardState[i] === player));
  }

  function isDraw() {
    return boardState.every(cell => cell !== '');
  }

  function highlightWin(player) {
    for (const combo of winCombos) {
      if (combo.every(i => boardState[i] === player)) {
        combo.forEach(i => cells[i].classList.add('win-cell'));
        break;
      }
    }
    cells.forEach(c => c.classList.add('disabled'));
  }

  function resetBoardUI() {
    cells.forEach(c => {
      c.textContent = '';
      c.classList.remove('disabled', 'win-cell');
    });
  }

  function updateScores() {
    scoreXDisplay.textContent = `Player X: ${scores.X}`;
    scoreODisplay.textContent = `Player O: ${scores.O}`;
    scoreDrawDisplay.textContent = `Draws: ${scores.draw}`;
  }

  function updateStatus(text) {
    statusDisplay.textContent = text;
  }

  function switchTurn() {
    currentPlayer = (currentPlayer === X) ? O : X;
  }

  function minimax(newBoard, player) {
    const availSpots = newBoard.reduce((acc,v,i) => { if(v==='') acc.push(i); return acc; }, []);

    if (checkWinnerMinimax(newBoard, playerSymbol)) return {score: -10};
    if (checkWinnerMinimax(newBoard, cpuSymbol)) return {score: 10};
    if (availSpots.length === 0) return {score:0};

    let moves = [];

    for (let i = 0; i < availSpots.length; i++) {
      let move = {};
      move.index = availSpots[i];
      newBoard[availSpots[i]] = player;

      if (player === cpuSymbol) {
        let result = minimax(newBoard, playerSymbol);
        move.score = result.score;
      } else {
        let result = minimax(newBoard, cpuSymbol);
        move.score = result.score;
      }

      newBoard[availSpots[i]] = '';
      moves.push(move);
    }

    let bestMove;
    if (player === cpuSymbol) {
      let bestScore = -Infinity;
      for (let i = 0; i < moves.length; i++) {
        if (moves[i].score > bestScore) {
          bestScore = moves[i].score;
          bestMove = i;
        }
      }
    } else {
      let bestScore = Infinity;
      for (let i = 0; i < moves.length; i++) {
        if (moves[i].score < bestScore) {
          bestScore = moves[i].score;
          bestMove = i;
        }
      }
    }
    return moves[bestMove];
  }

  function checkWinnerMinimax(board, player) {
    return winCombos.some(c => c.every(i => board[i] === player));
  }

  function getBestMove() {
    if (difficulty === 'easy') {
      let available = [];
      boardState.forEach((v,i) => { if(v==='') available.push(i); });
      return available.length ? available[Math.floor(Math.random() * available.length)] : -1;
    } else if (difficulty === 'medium') {
      return minimax(boardState.slice(), cpuSymbol).index;
    } else {
      return minimax(boardState.slice(), cpuSymbol).index;
    }
  }

  /* Game actions */

  function makeMove(index, player, userInitiated = true) {
    if(boardState[index] !== '' || !gameActive) return false;
    boardState[index] = player;
    const cell = cells[index];
    cell.textContent = player;
    cell.classList.add('disabled');
    moveHistory.push(index);

    playSound(soundMove);

    if(checkWin(player)) {
      gameActive = false;
      highlightWin(player);
      scores[player]++;
      updateScores();
      updateStatus(player === playerSymbol ? 'You win!' : (gameMode==='pvp'? `Player ${player} wins!` : 'Computer wins!'));
      playSound(soundWin);
    } else if(isDraw()) {
      gameActive = false;
      scores.draw++;
      updateScores();
      updateStatus('It\'s a draw!');
      playSound(soundDraw);
    } else {
      switchTurn();
      updateStatus(gameMode==='pvc' && currentPlayer === cpuSymbol ? 'Computer\'s turn...' : `${currentPlayer}'s turn`);
      if(gameMode === 'pvc' && currentPlayer === cpuSymbol && gameActive){
        window.setTimeout(computerMove, 400);
      }
    }
    undoBtn.disabled = false;
    return true;
  }

  function computerMove(){
    if(!gameActive) return;
    const move = getBestMove();
    if(move !== -1){
      makeMove(move, cpuSymbol, false);
    }
  }

  function undoMove(){
    if(moveHistory.length === 0 || !gameActive) return;
    let lastMove = moveHistory.pop();
    boardState[lastMove] = '';
    const cell = cells[lastMove];
    cell.textContent = '';
    cell.classList.remove('disabled','win-cell');

    playSound(soundUndo);

    // If PVC, undo one more move (CPU's)
    if(gameMode === 'pvc' && moveHistory.length > 0){
      let cpuMove = moveHistory.pop();
      boardState[cpuMove] = '';
      const cpuCell = cells[cpuMove];
      cpuCell.textContent = '';
      cpuCell.classList.remove('disabled','win-cell');
    }
    currentPlayer = playerSymbol;
    updateStatus((gameMode==='pvc' ? 'Your' : 'Player ' + currentPlayer) + '\'s turn');
    moveHistory.length === 0 ? undoBtn.disabled = true : undoBtn.disabled = false;
  }

  function resetGame(){
    gameActive = true;
    boardState.fill('');
    currentPlayer = X;
    playerSymbol = symbolSelect.value;
    cpuSymbol = playerSymbol === X ? O : X;
    moveHistory = [];
    resetBoardUI();
    updateScores();
    updateStatus(`${currentPlayer}'s turn`);
    undoBtn.disabled = true;
    toggleDifficultyVisibility();
    if(gameMode === 'pvc' && currentPlayer === cpuSymbol){
      window.setTimeout(computerMove, 400);
    }
  }

  function toggleDifficultyVisibility(){
    difficultySelect.classList.toggle('hidden', gameMode !== 'pvc');
    difficulty = difficultySelect.value;
  }

  function playSound(sound) {
    if (!sound) return;
    sound.currentTime = 0; // Reset sound to start
    sound.play().catch(() => {}); // Play sound
  }

  /* Event listeners */
  modeSelect.addEventListener('change', e => {
    gameMode = modeSelect.value;
    toggleDifficultyVisibility();
    resetGame();
  });

  difficultySelect.addEventListener('change', e => {
    difficulty = difficultySelect.value;
  });

  symbolSelect.addEventListener('change', e => {
    playerSymbol = symbolSelect.value;
    cpuSymbol = playerSymbol === X ? O : X;
    resetGame();
  });

  undoBtn.addEventListener('click', undoMove);
  restartBtn.addEventListener('click', resetGame);
  resetBtn.addEventListener('click', () => {
    scores = {X: 0, O: 0, draw: 0};
    updateScores();
    resetGame();
  });

  cells.forEach((cell, index) => {
    cell.addEventListener('click', () => {
      if(gameActive && !cell.classList.contains('disabled') && !(gameMode==='pvc' && currentPlayer !== playerSymbol)){
        makeMove(index, currentPlayer);
      }
    });
  });

  /* Initialize */
  toggleDifficultyVisibility();
  updateScores();
  resetGame();

})();
