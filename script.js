// DOM elements and game state variables
const grid = document.getElementById('grid');
const resetBtn = document.getElementById('resetBtn');
const message = document.getElementById('message');
const scoreElement = document.getElementById('score');
const rotationsElement = document.getElementById('rotations');
const moreInfoBtn = document.getElementById('moreInfoBtn');
const testPathBtn = document.getElementById('testPathBtn');

let gameOver = false;
let score = 0;
let rotations = 0;

// Direction mapping
function getConnections(type, rotation) {
  const baseConnections = {
    'straight-h': ['left', 'right'],
    'straight-v': ['top', 'bottom'],
    'curve-tl': ['top', 'left'],
    'curve-tr': ['top', 'right'],
    'curve-bl': ['bottom', 'left'],
    'curve-br': ['bottom', 'right'],
    'cross': ['top', 'right', 'bottom', 'left'],
    'start': ['right', 'bottom'],
    'goal': ['top', 'right', 'bottom', 'left']

  };

  const rotateDirection = {
    0: { top: 'top', right: 'right', bottom: 'bottom', left: 'left' },
    90: { top: 'right', right: 'bottom', bottom: 'left', left: 'top' },
    180: { top: 'bottom', right: 'left', bottom: 'top', left: 'right' },
    270: { top: 'left', right: 'top', bottom: 'right', left: 'bottom' }
  };

  const directions = baseConnections[type] || [];
  return directions.map(dir => rotateDirection[rotation][dir]);
}

function createGrid() {
  grid.innerHTML = '';
  gameOver = false;
  message.textContent = '';
  rotations = 0;
  rotationsElement.textContent = rotations;

  const tileTypes = ['straight-h', 'straight-v', 'curve-tl', 'curve-tr', 'curve-bl', 'curve-br', 'cross'];
  const totalTiles = 25;
  const startTileIndex = 0;

  // Helper: Manhattan distance between tile indices
  function manhattanDistance(i1, i2) {
    const x1 = i1 % 5;
    const y1 = Math.floor(i1 / 5);
    const x2 = i2 % 5;
    const y2 = Math.floor(i2 / 5);
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
  }

  // Place goal tile far enough from start
  let goalTileIndex;
  do {
    goalTileIndex = Math.floor(Math.random() * totalTiles);
  } while (
    goalTileIndex === startTileIndex ||
    manhattanDistance(startTileIndex, goalTileIndex) < 4
  );

  let crossTileCount = 0;
  const maxCrossTiles = 3;

  for (let i = 0; i < totalTiles; i++) {
    const tile = document.createElement('div');
    tile.classList.add('tile');
    tile.dataset.index = i;

    // START TILE
    if (i === startTileIndex) {
      tile.classList.add('start-tile');
      tile.dataset.type = 'start';
      tile.dataset.rotation = 0;
      const img = document.createElement('img');
      img.src = 'img/water-can.png';
      img.alt = 'Start Tile';
      tile.appendChild(img);
    }

    // GOAL TILE
    else if (i === goalTileIndex) {
      tile.classList.add('goal-tile');
      tile.dataset.type = 'goal';
      tile.dataset.rotation = 0;
      tile.innerText = 'goal'; // Replace with image if desired
    }

    // REGULAR PIPE TILES
    else {
      let type;
      do {
        type = tileTypes[Math.floor(Math.random() * tileTypes.length)];
      } while (type === 'cross' && crossTileCount >= maxCrossTiles);

      if (type === 'cross') {
        crossTileCount++;
      }

      tile.dataset.type = type;
      const rotation = [0, 90, 180, 270][Math.floor(Math.random() * 4)];
      tile.dataset.rotation = rotation;
      tile.style.transform = `rotate(${rotation}deg)`;
    }

    // Add click listener (not for start tile)
    if (i !== startTileIndex) {
      tile.addEventListener('click', () => handleClick(tile, i));
    }

    grid.appendChild(tile);
  }

  // Optional: Debug log for all tiles
  document.querySelectorAll('.tile').forEach((tile, i) => {
    console.log(`Tile ${i}: ${tile.dataset.type}, rotation: ${tile.dataset.rotation}`);
  });
}



      

function handleClick(tile, index) {
  if (gameOver) return;
  if (tile.classList.contains('start-tile')) return;

  let currentRotation = parseInt(tile.dataset.rotation || 0);
  currentRotation = (currentRotation + 90) % 360;
  tile.dataset.rotation = currentRotation;
  tile.style.transform = `rotate(${currentRotation}deg)`;

  updateRotations();
}

function updateRotations() {
  rotations++;
  rotationsElement.textContent = rotations;
}

// ✅ Path checking logic
function checkForValidPath() {
  const tiles = document.querySelectorAll('.tile');

  let startIndex = -1;
  let goalIndex = -1;

  tiles.forEach((tile, i) => {
    if (tile.classList.contains('start-tile')) startIndex = i;
    if (tile.classList.contains('goal-tile')) goalIndex = i;
    tile.classList.remove('path'); // Clear any previous highlights
  });

  if (startIndex === -1 || goalIndex === -1) return;

  const visited = new Set();
  const pathMap = new Map(); // key = index, value = previous index
  const queue = [startIndex];

  const directions = {
    top: -5,
    bottom: 5,
    left: -1,
    right: 1
  };

  const isValidNeighbor = (fromIndex, toIndex, direction) => {
    if (toIndex < 0 || toIndex >= 25) return false;
    if ((direction === 'left' && fromIndex % 5 === 0) ||
        (direction === 'right' && fromIndex % 5 === 4)) return false;
    return true;
  };

  while (queue.length > 0) {
    const currentIndex = queue.shift();
    if (visited.has(currentIndex)) continue;
    visited.add(currentIndex);

    const currentTile = tiles[currentIndex];
    const currentType = currentTile.dataset.type;
    const currentRotation = parseInt(currentTile.dataset.rotation || 0);
    const connections = getConnections(currentType, currentRotation);

    for (let dir of connections) {
      const neighborIndex = currentIndex + directions[dir];
      const opposite = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

      if (!isValidNeighbor(currentIndex, neighborIndex, dir)) continue;

      const neighborTile = tiles[neighborIndex];
      const neighborType = neighborTile.dataset.type;
      const neighborRotation = parseInt(neighborTile.dataset.rotation || 0);
      const neighborConnections = getConnections(neighborType, neighborRotation);

      if (neighborConnections.includes(opposite[dir])) {
        if (!visited.has(neighborIndex)) {
          queue.push(neighborIndex);
          pathMap.set(neighborIndex, currentIndex); // track the path
        }

        // ✅ WIN CONDITION
        if (neighborIndex === goalIndex) {
          message.textContent = '✅ Water reached the goal!';
          gameOver = true;

          let path = [];
          let pathCursor = currentIndex;
          // Build the path in reverse order
          while (pathMap.has(pathCursor)) {
            path.unshift(pathCursor);
            pathCursor = pathMap.get(pathCursor);
          }
          path.unshift(startIndex);
          path.push(goalIndex);
          
          // Animate each tile in order with a delay
          path.forEach((index, i) => {
            setTimeout(() => {
              tiles[index].classList.add('path-animated');
            }, i * 100); // 100ms delay between tiles
          });
          return;
        }
      }
    }
  }

  // ✅ No goal reached — highlight path to farthest reachable tile
  if (pathMap.size > 0) {
    let farthest = -1;
    let maxDistance = -1;

    pathMap.forEach((_, key) => {
      let count = 0;
      let cursor = key;
      while (pathMap.has(cursor)) {
        count++;
        cursor = pathMap.get(cursor);
      }
      if (count > maxDistance) {
        maxDistance = count;
        farthest = key;
      }
    });

    let pathCursor = farthest;
    while (pathMap.has(pathCursor)) {
      tiles[pathCursor].classList.add('path');
      pathCursor = pathMap.get(pathCursor);
    }
    tiles[startIndex].classList.add('path');

    message.textContent = 'No path to goal — but here’s how far the water got!';
  } else {
    message.textContent = 'No valid connections from the start tile.';
  }
}






// UI Button actions
moreInfoBtn.addEventListener('click', () => {
  alert('Rotate pipes to create a continuous water path from the start to the goal.');
});

resetBtn.addEventListener('click', createGrid);

testPathBtn.addEventListener('click', () => {
  checkForValidPath();
});
// Start the game
createGrid();
