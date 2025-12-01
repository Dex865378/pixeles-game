// PIXELES - Additional Game Modes (Phase 3)
// This file contains the logic for the 7 new modes

// Hunter Mode: Generate a grid with one different pixel
function setupHunterMode() {
    const baseColor = palette[Math.floor(Math.random() * palette.length)];
    let targetColor = palette[Math.floor(Math.random() * palette.length)];

    // Ensure target color is different
    while (targetColor === baseColor) {
        targetColor = palette[Math.floor(Math.random() * palette.length)];
    }

    // Fill grid with base color
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            state.grid[y][x] = baseColor;
        }
    }

    // Place one different pixel
    const tx = Math.floor(Math.random() * gridSize);
    const ty = Math.floor(Math.random() * gridSize);
    state.grid[ty][tx] = targetColor;
    state.hunterTarget = { x: tx, y: ty };
}

// Sequence Mode: Show a sequence of pixels to remember
function setupSequenceMode() {
    const sequenceLength = Math.min(3 + state.level, 10);
    state.sequencePattern = [];

    for (let i = 0; i < sequenceLength; i++) {
        state.sequencePattern.push({
            x: Math.floor(Math.random() * gridSize),
            y: Math.floor(Math.random() * gridSize),
            color: palette[Math.floor(Math.random() * palette.length)]
        });
    }

    state.sequenceIndex = 0;
    state.sequenceShowing = true;
    showSequence();
}

function showSequence() {
    if (state.sequenceIndex >= state.sequencePattern.length) {
        state.sequenceShowing = false;
        state.sequenceIndex = 0;
        return;
    }

    const pixel = state.sequencePattern[state.sequenceIndex];

    // Flash the pixel
    const originalColor = state.grid[pixel.y][pixel.x];
    state.grid[pixel.y][pixel.x] = pixel.color;
    playSound('blip', 400 + (state.sequenceIndex * 100));

    setTimeout(() => {
        state.grid[pixel.y][pixel.x] = originalColor;
        state.sequenceIndex++;
        setTimeout(() => showSequence(), 300);
    }, 500);
}

function checkSequenceClick(x, y) {
    if (state.sequenceShowing) return;

    const expected = state.sequencePattern[state.sequenceIndex];

    if (x === expected.x && y === expected.y) {
        state.grid[y][x] = expected.color;
        playSound('blip', 600);
        state.sequenceIndex++;

        if (state.sequenceIndex >= state.sequencePattern.length) {
            handleSuccess();
        }
    } else {
        handleFail("Wrong sequence!");
    }
}

// Picross Mode: Simple nonogram with number hints
function setupPicrossMode() {
    // Generate a simple pattern
    state.targetGrid = [];
    for (let y = 0; y < gridSize; y++) {
        state.targetGrid.push(new Array(gridSize).fill(null));
    }

    // Create a simple shape
    const shapeColor = palette[Math.floor(Math.random() * palette.length)];
    const centerX = Math.floor(gridSize / 2);
    const centerY = Math.floor(gridSize / 2);
    const size = Math.floor(gridSize / 3);

    for (let y = centerY - size; y <= centerY + size; y++) {
        for (let x = centerX - size; x <= centerX + size; x++) {
            if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
                if (Math.random() < 0.6) {
                    state.targetGrid[y][x] = shapeColor;
                }
            }
        }
    }
}

// 1-Bit Mode: Convert color image to black and white
function setup1BitMode() {
    // Generate a colorful target
    generateSymmetricPattern();

    // Player can only use black and white
    setupPalette(['#000000', '#FFFFFF']);
}

// Blind Mode: Toggle visibility
function setupBlindMode() {
    state.blindVisible = true;

    // Toggle visibility every 2 seconds
    setInterval(() => {
        if (state.isPlaying && state.mode === 'blind') {
            state.blindVisible = !state.blindVisible;
        }
    }, 2000);
}

// Palette Swap Mode: Colors are mapped incorrectly
function setupPaletteSwapMode() {
    // Create a random color mapping
    state.paletteSwapMap = {};
    const shuffledPalette = [...palette].sort(() => Math.random() - 0.5);

    palette.forEach((color, index) => {
        state.paletteSwapMap[color] = shuffledPalette[index];
    });

    // Generate target with swapped colors
    generateSymmetricPattern();
}

// Kaleidoscope Mode: Just needs the mirroring in applyTool (already done)
function setupKaleidoscopeMode() {
    // No special setup needed, mirroring is handled in applyTool
}
