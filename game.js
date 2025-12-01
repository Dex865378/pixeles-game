// PIXELES - Game Engine (Mega Update Phase 2)

const canvas = document.getElementById('pixel-canvas');
const ctx = canvas.getContext('2d');
const targetCanvas = document.getElementById('target-canvas');
const targetCtx = targetCanvas.getContext('2d');

// Game Configuration
let gridSize = 16;
let pixelSize = canvas.width / gridSize;
let targetPixelSize = targetCanvas.width / gridSize;

// Audio Context
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

// Game State
let state = {
    mode: null,
    isPlaying: false,
    level: 1,
    score: 0,
    time: 30,
    lives: 3,
    currentTool: 'pencil',
    currentColor: '#000000',
    grid: [],
    targetGrid: [],
    timerInterval: null,
    memoryTimeout: null,

    // Action Mode Specifics
    lastUpdate: 0,
    drops: [],
    virusTimer: 0,

    // Logic Mode Specifics
    mixPalette: {},
    negativeMap: {},

    // New Modes Specifics
    hunterTarget: null, // For Hunter mode
    sequencePattern: [], // For Sequence mode
    sequenceIndex: 0,
    sequenceShowing: false,
    kaleidoQuadrant: 0, // For Kaleidoscope
    blindVisible: true, // For Blind mode
    paletteSwapMap: {} // For Palette Swap
};

// Standard Palette
const palette = [
    '#000000', '#1D2B53', '#7E2553', '#008751', '#AB5236', '#5F574F', '#C2C3C7', '#FFF1E8',
    '#FF004D', '#FFA300', '#FFEC27', '#00E436', '#29ADFF', '#83769C', '#FF77A8', '#FFCCAA',
    '#00ff88', '#b026ff', '#ff006e', '#00ffff'
];

// Color Mix Palette (Primaries)
const primaryPalette = ['#FF0000', '#0000FF', '#FFFF00', '#FFFFFF', '#000000'];
// Color Mix Definitions
const colorMixes = {
    '#FF0000+#0000FF': '#800080', // Purple
    '#0000FF+#FF0000': '#800080',
    '#FF0000+#FFFF00': '#FFA500', // Orange
    '#FFFF00+#FF0000': '#FFA500',
    '#0000FF+#FFFF00': '#008000', // Green
    '#FFFF00+#0000FF': '#008000'
};

// Negative Pairs
const negativePairs = {
    '#000000': '#FFFFFF', '#FFFFFF': '#000000',
    '#FF0000': '#00FFFF', '#00FFFF': '#FF0000', // Red <-> Cyan
    '#00FF00': '#FF00FF', '#FF00FF': '#00FF00', // Green <-> Magenta
    '#0000FF': '#FFFF00', '#FFFF00': '#0000FF'  // Blue <-> Yellow
};

// --- INITIALIZATION ---
function init() {
    setupTools();
    setupCanvas();
    window.addEventListener('resize', resizeCanvas);
    requestAnimationFrame(gameLoop);
}

function setupPalette(customColors = null) {
    const container = document.getElementById('palette');
    container.innerHTML = '';
    const colorsToUse = customColors || palette;

    colorsToUse.forEach((color, index) => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.backgroundColor = color;
        if (index === 0) {
            swatch.classList.add('active');
            state.currentColor = color;
        }

        swatch.onclick = () => {
            playSound('blip', 400);
            document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
            swatch.classList.add('active');
            state.currentColor = color;
        };
        container.appendChild(swatch);
    });
}

function setupTools() {
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.onclick = () => {
            playSound('blip', 300);
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.currentTool = btn.dataset.tool;
        };
    });
}

function setupCanvas() {
    let isDrawing = false;

    const draw = (e) => {
        state.mouseX = e.clientX;
        state.mouseY = e.clientY;

        if (!state.isPlaying) return;

        if (state.mode === 'rain' && isDrawing) {
            checkRainHit(e);
            return;
        }

        if (!isDrawing) return;

        const rect = canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / pixelSize);
        const y = Math.floor((e.clientY - rect.top) / pixelSize);

        if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
            applyTool(x, y);
        }
    };

    canvas.addEventListener('mousedown', (e) => { isDrawing = true; draw(e); });
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', () => isDrawing = false);
    canvas.addEventListener('mouseleave', () => isDrawing = false);
}

function applyTool(x, y) {
    // Hunter Mode: Click to find the different pixel
    if (state.mode === 'hunter') {
        if (state.hunterTarget && x === state.hunterTarget.x && y === state.hunterTarget.y) {
            handleSuccess();
        } else {
            handleFail("Wrong pixel!");
        }
        return;
    }

    // Sculptor Mode
    if (state.mode === 'sculptor' && state.currentTool !== 'eraser') {
        if (state.currentTool === 'pencil') {
            state.grid[y][x] = null;
            playSound('draw', 100);
            return;
        }
    }

    // Color Mix Mode
    if (state.mode === 'colormix' && state.currentTool === 'pencil') {
        const existing = state.grid[y][x];
        if (existing && existing !== state.currentColor) {
            const key = `${existing}+${state.currentColor}`;
            if (colorMixes[key]) {
                state.grid[y][x] = colorMixes[key];
                playSound('powerup', 500);
                return;
            }
        }
    }

    // Kaleidoscope Mode: Mirror to all 4 quadrants
    if (state.mode === 'kaleidoscope') {
        const halfX = Math.floor(gridSize / 2);
        const halfY = Math.floor(gridSize / 2);

        // Calculate mirrored positions
        const positions = [
            [x, y],
            [gridSize - 1 - x, y],
            [x, gridSize - 1 - y],
            [gridSize - 1 - x, gridSize - 1 - y]
        ];

        positions.forEach(([px, py]) => {
            if (px >= 0 && px < gridSize && py >= 0 && py < gridSize) {
                if (state.currentTool === 'pencil') {
                    state.grid[py][px] = state.currentColor;
                } else if (state.currentTool === 'eraser') {
                    state.grid[py][px] = null;
                }
            }
        });

        playSound('draw', 200 + (y * 20));
        return;
    }

    // Standard drawing
    if (state.currentTool === 'pencil') {
        if (state.grid[y][x] !== state.currentColor) {
            state.grid[y][x] = state.currentColor;
            playSound('draw', 200 + (y * 20));
        }
    } else if (state.currentTool === 'eraser') {
        state.grid[y][x] = null;
    } else if (state.currentTool === 'bucket') {
        fill(x, y, state.currentColor);
        playSound('powerup', 300);
    }
}

function fill(startX, startY, color) {
    const targetColor = state.grid[startY][startX];
    if (targetColor === color) return;
    const stack = [[startX, startY]];
    while (stack.length) {
        const [x, y] = stack.pop();
        if (state.grid[y][x] === targetColor) {
            state.grid[y][x] = color;
            if (x > 0) stack.push([x - 1, y]);
            if (x < gridSize - 1) stack.push([x + 1, y]);
            if (y > 0) stack.push([x, y - 1]);
            if (y < gridSize - 1) stack.push([x, y + 1]);
        }
    }
}

// --- GAME LOOP ---
function gameLoop(timestamp) {
    if (state.isPlaying) {
        update(timestamp);
        render();
    }
    requestAnimationFrame(gameLoop);
}

function update(timestamp) {
    if (!state.lastUpdate) state.lastUpdate = timestamp;

    // Virus Mode Logic
    if (state.mode === 'virus') {
        if (timestamp - state.virusTimer > (1000 - (state.level * 50))) {
            spreadVirus();
            state.virusTimer = timestamp;
        }
    }

    // Rain Mode Logic
    if (state.mode === 'rain') {
        updateRain();
    }

    state.lastUpdate = timestamp;
}

// --- RENDERING ---
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Flashlight Mask
    if (state.mode === 'flashlight') {
        ctx.save();
        ctx.beginPath();
        const rect = canvas.getBoundingClientRect();
        const mx = state.mouseX - rect.left;
        const my = state.mouseY - rect.top;
        ctx.arc(mx, my, 60, 0, Math.PI * 2);
        ctx.clip();
    }

    // Render Grid
    const gridOpacity = (state.mode === 'blind' && !state.blindVisible) ? 0.1 : 1;

    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            ctx.fillStyle = (x + y) % 2 === 0 ? '#111' : '#1a1a1a';
            ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);

            if (state.grid[y][x]) {
                ctx.globalAlpha = gridOpacity;
                ctx.fillStyle = state.grid[y][x];
                ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);

                // Texture for Sculptor
                if (state.mode === 'sculptor') {
                    ctx.fillStyle = 'rgba(0,0,0,0.2)';
                    ctx.fillRect(x * pixelSize + 2, y * pixelSize + 2, pixelSize - 4, pixelSize - 4);
                } else {
                    ctx.fillStyle = 'rgba(255,255,255,0.1)';
                    ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, 4);
                    ctx.fillRect(x * pixelSize, y * pixelSize, 4, pixelSize);
                }
                ctx.globalAlpha = 1;
            }
        }
    }

    // Rain Drops
    if (state.mode === 'rain') {
        state.drops.forEach(drop => {
            ctx.fillStyle = drop.color;
            ctx.fillRect(drop.x * pixelSize, drop.y, pixelSize, pixelSize);
        });
    }

    // Flashlight Restore
    if (state.mode === 'flashlight') {
        ctx.restore();
        ctx.fillStyle = 'rgba(0,0,0,0.95)';
        ctx.beginPath();
        ctx.rect(0, 0, canvas.width, canvas.height);
        const rect = canvas.getBoundingClientRect();
        const mx = state.mouseX - rect.left;
        const my = state.mouseY - rect.top;
        ctx.arc(mx, my, 60, 0, Math.PI * 2, true);
        ctx.fill();
    }

    // Grid Lines
    if (gridSize <= 16 && state.mode !== 'flashlight') {
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i <= gridSize; i++) {
            ctx.moveTo(i * pixelSize, 0);
            ctx.lineTo(i * pixelSize, canvas.height);
            ctx.moveTo(0, i * pixelSize);
            ctx.lineTo(canvas.width, i * pixelSize);
        }
        ctx.stroke();
    }

    // Render Target
    if (state.mode !== 'creative' && state.mode !== 'rain' && state.mode !== 'virus') {
        targetCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);

        targetCtx.save();
        // Rotation
        if (state.mode === 'rotation') {
            const time = Date.now() / 1000;
            if (Math.floor(time) % 4 === 0) {
                targetCtx.translate(targetCanvas.width / 2, targetCanvas.height / 2);
                targetCtx.rotate(Math.PI / 2);
                targetCtx.translate(-targetCanvas.width / 2, -targetCanvas.height / 2);
            }
        }

        let renderWidth = gridSize;
        if (state.mode === 'mirror') renderWidth = Math.ceil(gridSize / 2);

        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                targetCtx.fillStyle = (x + y) % 2 === 0 ? '#111' : '#1a1a1a';
                targetCtx.fillRect(x * targetPixelSize, y * targetPixelSize, targetPixelSize, targetPixelSize);

                if (x < renderWidth && state.targetGrid[y][x]) {
                    let drawColor = state.targetGrid[y][x];

                    // Silhouette Mode: Always Black
                    if (state.mode === 'silhouette') drawColor = '#000000';

                    targetCtx.fillStyle = drawColor;
                    targetCtx.fillRect(x * targetPixelSize, y * targetPixelSize, targetPixelSize, targetPixelSize);
                } else if (state.mode === 'mirror' && x >= renderWidth) {
                    targetCtx.fillStyle = '#000';
                    targetCtx.fillRect(x * targetPixelSize, y * targetPixelSize, targetPixelSize, targetPixelSize);
                }
            }
        }

        if (state.mode === 'mirror') {
            targetCtx.strokeStyle = '#ff006e';
            targetCtx.lineWidth = 2;
            targetCtx.beginPath();
            targetCtx.moveTo(renderWidth * targetPixelSize, 0);
            targetCtx.lineTo(renderWidth * targetPixelSize, targetCanvas.height);
            targetCtx.stroke();
        }

        targetCtx.restore();
    }
}

// --- LOGIC HELPERS ---
function spreadVirus() {
    let virusPixels = [];
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            if (state.grid[y][x] === '#00ff88') virusPixels.push({ x, y });
        }
    }
    if (virusPixels.length > 0) {
        const source = virusPixels[Math.floor(Math.random() * virusPixels.length)];
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        const dir = dirs[Math.floor(Math.random() * dirs.length)];
        const nx = source.x + dir[0];
        const ny = source.y + dir[1];
        if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
            state.grid[ny][nx] = '#00ff88';
            playSound('blip', 100);
        }
    }
    if (virusPixels.length > (gridSize * gridSize) / 2) handleFail("Infection Critical!");
}

function updateRain() {
    if (Math.random() < 0.05 + (state.level * 0.01)) {
        state.drops.push({
            x: Math.floor(Math.random() * gridSize),
            y: -pixelSize,
            speed: 2 + (state.level * 0.5),
            color: palette[Math.floor(Math.random() * palette.length)]
        });
    }
    for (let i = state.drops.length - 1; i >= 0; i--) {
        let drop = state.drops[i];
        drop.y += drop.speed;
        if (drop.y > canvas.height) {
            state.drops.splice(i, 1);
            handleFail("Missed drop!");
        }
    }
}

function checkRainHit(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    for (let i = state.drops.length - 1; i >= 0; i--) {
        let drop = state.drops[i];
        if (mx > drop.x * pixelSize && mx < (drop.x + 1) * pixelSize &&
            my > drop.y && my < drop.y + pixelSize) {
            state.drops.splice(i, 1);
            state.score += 10;
            playSound('blip', 600);
            updateHUD();
            return;
        }
    }
}

// --- GAME START ---
function startGame(mode) {
    if (audioCtx.state === 'suspended') audioCtx.resume();

    state.mode = mode;
    state.isPlaying = true;
    state.score = 0;
    state.lives = 3;
    state.level = 1;
    state.drops = [];

    document.getElementById('main-menu').classList.remove('active');
    document.getElementById('game-screen').classList.add('active');

    const targetContainer = document.getElementById('target-container');
    const actionBtn = document.getElementById('action-btn');
    const instruction = document.getElementById('instruction-text');

    targetContainer.style.display = 'block';
    actionBtn.style.display = 'block';
    instruction.innerText = "";

    // Default Palette
    setupPalette();

    // Mode Specific Setup
    if (mode === 'creative') {
        gridSize = 32;
        targetContainer.style.display = 'none';
        actionBtn.style.display = 'none';
    } else if (mode === 'rain' || mode === 'virus') {
        gridSize = 16;
        targetContainer.style.display = 'none';
        actionBtn.style.display = 'none';
        instruction.innerText = mode === 'rain' ? "Click falling blocks!" : "Contain the virus!";
    } else if (mode === 'colormix') {
        gridSize = 8;
        setupPalette(primaryPalette);
        instruction.innerText = "Mix Red+Blue=Purple, Red+Yellow=Orange";
    } else if (mode === 'negative') {
        gridSize = 8;
        setupPalette(['#000000', '#FFFFFF', '#FF0000', '#00FFFF', '#00FF00', '#FF00FF', '#0000FF', '#FFFF00']);
        instruction.innerText = "Paint the OPPOSITE color!";
    } else if (mode === 'sculptor') {
        gridSize = 10;
        setupPalette(['#5F574F']); // Stone color only, but tool is eraser
        instruction.innerText = "Use Pencil to break stone!";
    } else if (mode === 'silhouette') {
        gridSize = 10;
        instruction.innerText = "Guess the shape!";
    }

    updateGridDimensions();

    if (mode !== 'creative') {
        nextLevel();
    } else {
        resetGrid();
    }
}

function updateGridDimensions() {
    pixelSize = canvas.width / gridSize;
    targetPixelSize = targetCanvas.width / gridSize;
}

function resetGrid() {
    state.grid = [];
    for (let y = 0; y < gridSize; y++) {
        let row = [];
        for (let x = 0; x < gridSize; x++) {
            row.push(null);
        }
        state.grid.push(row);
    }
}

function nextLevel() {
    // Scaling
    if (['rain', 'virus', 'creative'].includes(state.mode)) {
        // Fixed size
    } else {
        if (state.level <= 3) gridSize = 8;
        else if (state.level <= 6) gridSize = 10;
        else gridSize = 16;
    }
    updateGridDimensions();

    // Generate Target
    if (!['rain', 'virus'].includes(state.mode)) {
        if (state.mode === 'colormix') generateColorMixTarget();
        else if (state.mode === 'negative') generateNegativeTarget();
        else generateSymmetricPattern();
    }

    // Setup Player Grid
    resetGrid();

    if (state.mode === 'defusal') {
        state.grid = JSON.parse(JSON.stringify(state.targetGrid));
        addNoiseToGrid();
    } else if (state.mode === 'virus') {
        state.grid[Math.floor(gridSize / 2)][Math.floor(gridSize / 2)] = '#00ff88';
    } else if (state.mode === 'hunter') {
        fillNoiseWithTarget();
    } else if (state.mode === 'sculptor') {
        // Fill entire grid with stone
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                state.grid[y][x] = '#5F574F'; // Stone
            }
        }
    }

    // Memory Logic
    if (state.mode === 'memory') {
        document.getElementById('target-canvas').style.opacity = '1';
        if (state.memoryTimeout) clearTimeout(state.memoryTimeout);
        state.memoryTimeout = setTimeout(() => {
            document.getElementById('target-canvas').style.opacity = '0';
            playSound('blip', 100);
        }, 3000);
    } else {
        document.getElementById('target-canvas').style.opacity = '1';
    }

    state.time = Math.max(15, 45 - (state.level * 2));
    if (['rain', 'virus'].includes(state.mode)) state.time = 60;

    startTimer();
    playSound('levelup', 600);
}

// --- GENERATORS ---
function generateSymmetricPattern() {
    state.targetGrid = [];
    const levelColors = [];
    const numColors = Math.min(4, 1 + Math.ceil(state.level / 3));
    for (let i = 0; i < numColors; i++) levelColors.push(palette[Math.floor(Math.random() * palette.length)]);

    for (let y = 0; y < gridSize; y++) state.targetGrid.push(new Array(gridSize).fill(null));

    const halfWidth = Math.ceil(gridSize / 2);
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < halfWidth; x++) {
            if (Math.random() < 0.4) {
                const color = levelColors[Math.floor(Math.random() * levelColors.length)];
                state.targetGrid[y][x] = color;
                state.targetGrid[y][gridSize - 1 - x] = color;
            }
        }
    }
}

function generateColorMixTarget() {
    // Generate target using Secondary colors
    state.targetGrid = [];
    const secondaries = ['#800080', '#FFA500', '#008000'];

    for (let y = 0; y < gridSize; y++) state.targetGrid.push(new Array(gridSize).fill(null));

    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            if (Math.random() < 0.3) {
                state.targetGrid[y][x] = secondaries[Math.floor(Math.random() * secondaries.length)];
            }
        }
    }
}

function generateNegativeTarget() {
    // Generate standard pattern using specific pairs
    state.targetGrid = [];
    const pairs = [['#000000', '#FFFFFF'], ['#FF0000', '#00FFFF'], ['#00FF00', '#FF00FF'], ['#0000FF', '#FFFF00']];

    for (let y = 0; y < gridSize; y++) state.targetGrid.push(new Array(gridSize).fill(null));

    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            if (Math.random() < 0.3) {
                const pair = pairs[Math.floor(Math.random() * pairs.length)];
                // Target shows Color A, Player must paint Color B
                state.targetGrid[y][x] = pair[0];
            }
        }
    }
}

function addNoiseToGrid() {
    const noiseLevel = 0.2 + (state.level * 0.02);
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            if (Math.random() < noiseLevel) {
                if (Math.random() < 0.5) state.grid[y][x] = null;
                else state.grid[y][x] = palette[Math.floor(Math.random() * palette.length)];
            }
        }
    }
}

function fillNoiseWithTarget() {
    const mainColor = palette[0];
    const targetColor = palette[1];
    for (let y = 0; y < gridSize; y++) for (let x = 0; x < gridSize; x++) state.grid[y][x] = mainColor;
    const tx = Math.floor(Math.random() * gridSize);
    const ty = Math.floor(Math.random() * gridSize);
    state.targetGrid = [[tx, ty]];
    state.grid[ty][tx] = targetColor;
}

function startTimer() {
    if (state.timerInterval) clearInterval(state.timerInterval);
    updateHUD();
    state.timerInterval = setInterval(() => {
        state.time--;
        updateHUD();
        if (state.time <= 0) {
            if (['rain', 'virus'].includes(state.mode)) handleSuccess();
            else handleFail("Time's up!");
        }
    }, 1000);
}

function checkSolution() {
    if (state.mode === 'hunter') return;

    let isCorrect = true;
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            const pVal = state.grid[y][x] || null;
            const tVal = state.targetGrid[y][x] || null;

            if (state.mode === 'sculptor') {
                // For sculptor, player grid should match target grid
                // Target has shape, Player grid starts full.
                // If target is null, player should be null (erased).
                // If target has color, player should have stone (not erased).
                // Wait, logic: Sculptor reveals shape. So if target is NOT null, player must KEEP stone?
                // Or player must carve the shape? Usually sculptor means removing excess.
                // Let's say: Target shows the shape. Player must REMOVE everything ELSE.
                // So: If Target(x,y) has color, Player(x,y) must be Stone.
                // If Target(x,y) is null, Player(x,y) must be null.

                const shouldBeStone = tVal !== null;
                const isStone = pVal !== null; // Any color (stone)

                if (shouldBeStone !== isStone) {
                    isCorrect = false;
                    break;
                }
            } else if (state.mode === 'negative') {
                // Check if pVal is the negative of tVal
                if (tVal === null) {
                    if (pVal !== null) { isCorrect = false; break; }
                } else {
                    if (negativePairs[tVal] !== pVal) { isCorrect = false; break; }
                }
            } else {
                // Standard Match
                if (pVal !== tVal) {
                    isCorrect = false;
                    break;
                }
            }
        }
    }

    if (isCorrect) handleSuccess();
    else handleFail("Incorrect!");
}

function handleSuccess() {
    state.score += 100 + (state.time * 10);
    state.level++;
    playSound('success', 800);
    document.body.style.backgroundColor = '#003300';
    setTimeout(() => document.body.style.backgroundColor = '', 100);
    nextLevel();
}

function handleFail(reason) {
    state.lives--;
    playSound('fail', 100);
    const gameArea = document.querySelector('.game-area');
    gameArea.style.transform = 'translate(5px, 5px)';
    setTimeout(() => gameArea.style.transform = 'translate(0, 0)', 150);
    updateHUD();

    if (state.lives <= 0) {
        gameOver();
    } else {
        if (state.mode === 'memory') {
            document.getElementById('target-canvas').style.opacity = '1';
            setTimeout(() => document.getElementById('target-canvas').style.opacity = '0', 1500);
        }
        state.time = 15;
        startTimer();
    }
}

function gameOver() {
    state.isPlaying = false;
    clearInterval(state.timerInterval);
    playSound('gameover', 50);
    alert(`GAME OVER\nMode: ${state.mode.toUpperCase()}\nLevel: ${state.level}\nScore: ${state.score}`);
    location.reload();
}

function updateHUD() {
    document.getElementById('score').innerText = state.score;
    document.getElementById('timer').innerText = state.time;
    let hearts = '';
    for (let i = 0; i < state.lives; i++) hearts += '❤️';
    document.getElementById('lives').innerText = hearts;
}

function playSound(type, freq) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'draw') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'success') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.linearRampToValueAtTime(880, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    } else if (type === 'fail') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(50, now + 0.3);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    } else if (type === 'blip') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
    } else if (type === 'levelup') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(600, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
    } else if (type === 'powerup') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(600, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
    }
}

function resizeCanvas() { }

init();
