
const canvas = document.getElementById("pixelCanvas");
const ctx = canvas.getContext("2d");

const palette = document.getElementById("palette");
const customColor = document.getElementById("customColor");
const colorPreview = document.getElementById("colorPreview");
const gridSizeSelect = document.getElementById("gridSize");
const gridSizeValue = document.getElementById("gridSizeValue");
const gridToggle = document.getElementById("gridToggle");
const pixelCount = document.getElementById("pixelCount");
const canvasInfo = document.getElementById("canvasInfo");

const COLORS = [
  "#000000", "#ffffff", "#ffd21f", "#ffae00",
  "#ff5757", "#e91e63", "#a855f7", "#6545ff",
  "#2196f3", "#00bcd4", "#00d084", "#8bc34a",
  "#795548", "#ff9800", "#ffc0cb", "#808080",
  "#663399", "#8b0000", "#006400", "#f5f5dc",
  "#87ceeb", "#ff69b4", "#c0c0c0", "#daa520"
];

let gridSize = 16;
let pixels = [];
let selectedColor = "#ffd21f";
let selectedTool = "pen";
let isDrawing = false;
let history = [];
let historyIndex = -1;
let lastCell = null;

function createEmptyGrid(size) {
  return Array.from(
    { length: size },
    () => Array(size).fill(null)
  );
}

function clonePixels(data) {
  return data.map(row => [...row]);
}

function saveHistory() {
  const snapshot = clonePixels(pixels);

  history = history.slice(0, historyIndex + 1);
  history.push(snapshot);

  if (history.length > 60) {
    history.shift();
  }

  historyIndex = history.length - 1;
  updateHistoryButtons();
}

function updateHistoryButtons() {
  document.getElementById("undoBtn").disabled = historyIndex <= 0;
  document.getElementById("redoBtn").disabled =
    historyIndex >= history.length - 1;

  document.getElementById("undoBtn").style.opacity =
    historyIndex <= 0 ? ".4" : "1";

  document.getElementById("redoBtn").style.opacity =
    historyIndex >= history.length - 1 ? ".4" : "1";
}

function undo() {
  if (historyIndex <= 0) return;

  historyIndex--;
  pixels = clonePixels(history[historyIndex]);
  render();
  updateHistoryButtons();
}

function redo() {
  if (historyIndex >= history.length - 1) return;

  historyIndex++;
  pixels = clonePixels(history[historyIndex]);
  render();
  updateHistoryButtons();
}

function drawGrid() {
  const cell = canvas.width / gridSize;

  ctx.strokeStyle = "#d0d0d0";
  ctx.lineWidth = Math.max(1, canvas.width / gridSize / 40);

  for (let i = 0; i <= gridSize; i++) {
    const position = i * cell;

    ctx.beginPath();
    ctx.moveTo(position, 0);
    ctx.lineTo(position, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, position);
    ctx.lineTo(canvas.width, position);
    ctx.stroke();
  }
}

function render() {
  const cell = canvas.width / gridSize;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const color = pixels[y][x];

      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(
          x * cell,
          y * cell,
          cell,
          cell
        );
      }
    }
  }

  if (gridToggle.checked) {
    drawGrid();
  }

  updatePixelCount();
}

function updatePixelCount() {
  let count = 0;

  pixels.forEach(row => {
    row.forEach(color => {
      if (color !== null) count++;
    });
  });

  pixelCount.textContent = `Bo‘yalgan kataklar: ${count}`;
}

function renderPalette() {
  palette.innerHTML = "";

  COLORS.forEach(color => {
    const button = document.createElement("button");
    button.className = "swatch";
    button.style.background = color;
    button.title = color;

    if (color.toLowerCase() === selectedColor.toLowerCase()) {
      button.classList.add("active");
    }

    button.addEventListener("click", () => {
      chooseColor(color);
    });

    palette.appendChild(button);
  });
}

function chooseColor(color) {
  selectedColor = color;
  customColor.value = color;
  colorPreview.style.background = color;

  document.querySelectorAll(".swatch").forEach(button => {
    button.classList.toggle(
      "active",
      button.title.toLowerCase() === color.toLowerCase()
    );
  });

  if (selectedTool === "eraser" || selectedTool === "picker") {
    setTool("pen");
  }
}

function setTool(tool) {
  selectedTool = tool;

  document.querySelectorAll(".tool").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.tool === tool
    );
  });

  canvas.style.cursor =
    tool === "picker" ? "copy" :
    tool === "eraser" ? "cell" : "crosshair";
}

function getCell(event) {
  const rect = canvas.getBoundingClientRect();

  const x = Math.floor(
    ((event.clientX - rect.left) / rect.width) * gridSize
  );

  const y = Math.floor(
    ((event.clientY - rect.top) / rect.height) * gridSize
  );

  if (
    x < 0 || y < 0 ||
    x >= gridSize || y >= gridSize
  ) {
    return null;
  }

  return { x, y };
}

function floodFill(startX, startY, targetColor, replacementColor) {
  if (targetColor === replacementColor) return;

  const stack = [[startX, startY]];

  while (stack.length) {
    const [x, y] = stack.pop();

    if (
      x < 0 || y < 0 ||
      x >= gridSize || y >= gridSize
    ) continue;

    if (pixels[y][x] !== targetColor) continue;

    pixels[y][x] = replacementColor;

    stack.push([x + 1, y]);
    stack.push([x - 1, y]);
    stack.push([x, y + 1]);
    stack.push([x, y - 1]);
  }
}

function applyTool(cell) {
  if (!cell) return;

  const { x, y } = cell;

  if (selectedTool === "picker") {
    const color = pixels[y][x];

    if (color) chooseColor(color);
    return;
  }

  if (selectedTool === "fill") {
    floodFill(x, y, pixels[y][x], selectedColor);
    render();
    return;
  }

  if (selectedTool === "eraser") {
    pixels[y][x] = null;
  } else {
    pixels[y][x] = selectedColor;
  }

  render();
}

function pointerDown(event) {
  event.preventDefault();

  const cell = getCell(event);
  if (!cell) return;

  if (selectedTool === "fill" || selectedTool === "picker") {
    saveHistory();
    applyTool(cell);
    return;
  }

  saveHistory();
  isDrawing = true;
  lastCell = null;
  drawAt(cell);
  canvas.setPointerCapture(event.pointerId);
}

function drawAt(cell) {
  if (!cell) return;

  const key = `${cell.x},${cell.y}`;

  if (lastCell === key) return;

  lastCell = key;

  if (selectedTool === "eraser") {
    pixels[cell.y][cell.x] = null;
  } else {
    pixels[cell.y][cell.x] = selectedColor;
  }

  render();
}

function pointerMove(event) {
  if (!isDrawing) return;

  event.preventDefault();
  drawAt(getCell(event));
}

function pointerUp() {
  isDrawing = false;
  lastCell = null;
}

function changeGridSize(size) {
  const oldPixels = pixels;
  const oldSize = gridSize;

  gridSize = size;
  pixels = createEmptyGrid(size);

  // Eski rasmni yangi o‘lchamga moslashtirish
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const oldY = Math.floor(y * oldSize / size);
      const oldX = Math.floor(x * oldSize / size);

      pixels[y][x] = oldPixels[oldY][oldX];
    }
  }

  history = [];
  historyIndex = -1;
  saveHistory();

  gridSizeValue.textContent = `${size} × ${size}`;
  canvasInfo.textContent = `${size} × ${size} PIXEL`;

  render();
}

function clearCanvas() {
  if (!pixels.some(row => row.some(color => color !== null))) {
    return;
  }

  if (!confirm("Barcha kataklarni tozalashni xohlaysizmi?")) {
    return;
  }

  saveHistory();
  pixels = createEmptyGrid(gridSize);
  render();
}

function downloadImage() {
  const exportCanvas = document.createElement("canvas");
  const scale = 32;

  exportCanvas.width = gridSize * scale;
  exportCanvas.height = gridSize * scale;

  const exportCtx = exportCanvas.getContext("2d");

  exportCtx.fillStyle = "#ffffff";
  exportCtx.fillRect(
    0, 0,
    exportCanvas.width,
    exportCanvas.height
  );

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (pixels[y][x]) {
        exportCtx.fillStyle = pixels[y][x];

        exportCtx.fillRect(
          x * scale,
          y * scale,
          scale,
          scale
        );
      }
    }
  }

  const link = document.createElement("a");
  link.download = "jadra-pixel-art.png";
  link.href = exportCanvas.toDataURL("image/png");
  link.click();
}

const samples = {
  heart: [
    "00110001100",
    "01111011110",
    "11111111111",
    "11111111111",
    "01111111110",
    "00111111100",
    "00011111000",
    "00001110000",
    "00000100000"
  ],
  smile: [
    "001111100",
    "010000010",
    "100000001",
    "100101001",
    "100000001",
    "101000101",
    "100111001",
    "010000010",
    "001111100"
  ],
  star: [
    "000010000",
    "000010000",
    "000010000",
    "010010010",
    "001111100",
    "000111000",
    "001010100",
    "010000010",
    "000000000"
  ],
  house: [
    "00001110000",
    "00011111000",
    "00111111100",
    "01111111110",
    "11111111111",
    "00111111100",
    "00110001100",
    "00110001100",
    "00110001100",
    "00111111100",
    "00111111100"
  ],
  flower: [
    "000010000",
    "001010100",
    "000111000",
    "010111010",
    "000111000",
    "000010000",
    "000010000",
    "000111000",
    "000010000"
  ],
  diamond: [
    "00011000",
    "00111100",
    "01111110",
    "11111111",
    "01111110",
    "00111100",
    "00011000",
    "00001000"
  ]
};

function loadSample(name) {
  const pattern = samples[name];
  if (!pattern) return;

  const size = Math.max(
    pattern.length,
    ...pattern.map(row => row.length)
  );

  gridSize = size;
  gridSizeSelect.value = String(size);
  gridSizeValue.textContent = `${size} × ${size}`;
  canvasInfo.textContent = `${size} × ${size} PIXEL`;

  pixels = createEmptyGrid(size);

  const colors = {
    heart: "#ff3d67",
    smile: "#ffd21f",
    star: "#ffd21f",
    house: "#ffae00",
    flower: "#ff69b4",
    diamond: "#25d9ff"
  };

  const color = colors[name];

  pattern.forEach((row, y) => {
    [...row].forEach((value, x) => {
      if (value === "1") {
        pixels[y][x] = color;
      }
    });
  });

  history = [];
  historyIndex = -1;
  saveHistory();
  render();
}

// Voqealarni ulash
document.querySelectorAll(".tool").forEach(button => {
  button.addEventListener("click", () => {
    setTool(button.dataset.tool);
  });
});

customColor.addEventListener("input", event => {
  chooseColor(event.target.value);
});

gridSizeSelect.addEventListener("change", event => {
  changeGridSize(Number(event.target.value));
});

gridToggle.addEventListener("change", render);

canvas.addEventListener("pointerdown", pointerDown);
canvas.addEventListener("pointermove", pointerMove);
canvas.addEventListener("pointerup", pointerUp);
canvas.addEventListener("pointercancel", pointerUp);
canvas.addEventListener("lostpointercapture", pointerUp);

document.getElementById("undoBtn").addEventListener("click", undo);
document.getElementById("redoBtn").addEventListener("click", redo);
document.getElementById("clearBtn").addEventListener("click", clearCanvas);
document.getElementById("downloadBtn").addEventListener("click", downloadImage);

document.querySelectorAll(".sample").forEach(button => {
  button.addEventListener("click", () => {
    loadSample(button.dataset.sample);
  });
});

// Klaviatura orqali boshqarish
document.addEventListener("keydown", event => {
  if (event.ctrlKey && event.key.toLowerCase() === "z") {
    event.preventDefault();
    undo();
  }

  if (
    (event.ctrlKey && event.key.toLowerCase() === "y") ||
    (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "z")
  ) {
    event.preventDefault();
    redo();
  }
});

// Dastlabki holat
pixels = createEmptyGrid(gridSize);
renderPalette();
chooseColor(selectedColor);
saveHistory();
render();
