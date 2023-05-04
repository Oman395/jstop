import { readFileSync } from "fs";
import { fileURLToPath } from "node:url";
import {
  hideCursor,
  showCursor,
  write,
  clear,
  cursorTo,
  graph,
  color,
  getColorString,
  box,
  removeAnsiCodes
} from "./drawing.js";

// TODO: Define CHARS in opts
let CHARS = {
    h: "─",
    v: "│",
    tl: "╭",
    tr: "╮",
    bl: "╰",
    br: "╯",
    cu: "┴",
    cr: "├",
    cd: "┬",
    cl: "┤",
    c: "┼"
  },
  OPTS;

/**
 * @typedef {Object} Neighbors
 * @property {Array<Cell>} up - Array of cells bordering on top
 * @property {Array<Cell>} down - Array of cells bordering on bottom
 * @property {Array<Cell>} left - Array of cells bordering on left
 * @property {Array<Cell>} right - Array of cells bordering on right
 */

/**
 * Get a cell's neighbors. This is mostly used internally; cells should update their own neighbors,
 * so you can usually just get cell.neighbors.
 * @param {Cell} cell - Cell to get the neighbors of
 * @param {CellGroup} group - Group the cell is a part of
 * @returns {Neighbors}
 * The neighbors
 */
function getNeighbors(cell, group) {
  let neighbors = {
    up: [],
    down: [],
    left: [],
    right: []
  };
  group.forEach((c) => {
    // Figure out if c is a neighbor of cell
    if (c.y + c.height === cell.y) neighbors.down.push(c);
    else if (c.y === cell.y + cell.height) neighbors.up.push(c);
    else if (c.x + c.width === cell.x) neighbors.left.push(c);
    else if (c.x === cell.x + cell.width) neighbors.right.push(c);
  });
  return neighbors;
}

/**
 * Expands a cell to fit surrounding cells. This is also usually only used internally.
 * @param {Cell} cell - cell to expand
 * @returns {Cell} - Expanded cell (the reference to cell might be kept, I have no idea)
 */
function verifyDimensions(cell) {
  // This makes sure that every cell is expanded to fit the screen
  cell.neighbors.right.forEach((n) => {
    let deltaR = cell.x + cell.width - n.x;
    n.x += deltaR;
    n.width -= deltaR;
  });
  cell.neighbors.up.forEach((n) => {
    let deltaU = cell.y + cell.height - n.y;
    cell.height += deltaU;
  });
  cell.neighbors.down.forEach((n) => {
    let deltaU = n.y + n.height - cell.y;
    n.height -= deltaU;
  });

  if (cell.neighbors.right?.length === 0)
    cell.width += 1.0 - (cell.x + cell.width);
  if (cell.neighbors.left?.length === 0) (cell.width += cell.x), (cell.x = 0);
  if (cell.neighbors.top?.length === 0)
    cell.height += 1.0 - (cell.y + cell.height);
  if (cell.neighbors.bottom?.length === 0)
    (cell.height += cell.y), (cell.y = 0);
  return cell;
}

export class Cell {
  #draw = function (startX, startY, w, h) {
    write(
      "THIS IS A PLACEHOLDER FOR ANYONE WHO HASN'T DEFINED A DRAW() FOR THEIR CELL! Updated " +
        this.upCount +
        " times.",
      w,
      h,
      startX,
      startY
    );
  };
  /**
   * Draw cell to screen.
   * @param {number} startX - Starting X coordinate
   * @param {number} startY - Starting Y coordinate
   * @param {number} w - Width
   * @param {number} h - Height
   */
  draw(startX, startY, w, h) {
    // Clear formatting
    // TODO: Make sure everything has actual color options so I don't need to do this, which could cause
    // issues under certain circumstances
    process.stdout.write("\x1b[0m");
    this.#draw(startX, startY, w, h);
  }
  /**
   * Set a cell's draw function. Functions must have the parameters startX, startY, width, and height
   */
  setDraw(func) {
    this.#draw = func;
  }
  /**
   * Base cell class. This should very rarely be used, as most things should just inherit from it.
   * Note: Coordinates are 0-1.
   * @param x - X position
   * @param y - Y position
   * @param w - Width
   * @param h - Height
   * @param {CellGroup} parent - CellGroup the cell belongs to
   */
  constructor(x, y, w, h, parent) {
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
    this.parent = parent;
    this.upCount = 0;
  }
  /**
   * Shortcut to doing cell.neighbors = getNeighbors(cell, cell.parent)
   */
  updateNeighbors() {
    this.neighbors = getNeighbors(this, this.parent.cells);
  }
  // apply/add width/height are used internally, I don't recommend using them. I also won't be giving them
  // JSDoc.
  applyWidth(delta) {
    this.width += delta;
    this.x -= delta;
  }
  applyHeight(delta) {
    this.height += delta;
    this.y -= delta;
  }
  addWidth(delta) {
    this.width += delta;
  }
  addHeight(delta) {
    this.height += delta;
  }
  updateDimensionsAbsoluteCoordinates(w, h) {
    let finalW = w / process.stdout.columns;
    let finalH = h / process.stdout.rows;
    if (finalW > 1) finalW = 1;
    if (finalH > 1) finalH = 1;
    this.updateDimensions(finalW, finalH);
  }
  verifyDimensions() {
    let ver = verifyDimensions(this);
    this.height = ver.height;
    this.width = ver.width;
    this.x = ver.x;
    this.y = ver.y;
  }
  /**
   *Used to scale cells; if you pass in new width/height values (relative of course) it will handle
   * all the scaling of cells around them
   * Note: All dimensions are 0-1
   * @param {number} newW - New width
   * @param {number} newH - New height
   */
  updateDimensions(newW, newH) {
    let deltaW = this.width - newW;
    let deltaH = this.height - newH;
    this.width = newW;
    this.height = newH;
    this.neighbors.right.forEach((n) => n.applyWidth(deltaW));
    this.neighbors.up.forEach((n) => n.applyHeight(deltaH));
    let nT = verifyDimensions(this);
    // There's definitely a better way to do this, and the reference might be getting
    // passed, but I'm too lazy to check
    this.x = nT.x;
    this.y = nT.y;
    this.width = nT.width;
    this.height = nT.height;
    Object.keys(this.neighbors).forEach((key) =>
      this.neighbors[key].forEach((n) => n.verifyDimensions())
    );
  }
  /**
   * Mostly unused, I don't recommend using it.
   */
  update() {
    // This is basically useless but eh
    this.upCount++;
  }
}

export class CellGroup {
  /**
   * Group of cells. I'm about 35% sure this can be used as a cell in another group, but I don't
   * recommend it.
   * Note: Coordinates/dimensions are 0-1
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} w - Width
   * @param {number} h - Height
   * @param {Array<Array<Cell>>} layout - Layout of cells. Yes, it is already a bunch of cells; however,
   * the cells don't have all the references they should, so I just do this ~~cheap hack~~ epic programming
   * trick
   */
  constructor(x, y, w, h, layout) {
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
    this.cells = [];
    // For now, we'll just assume that the layout dimensions/positions are already normalized
    // TODO: THIS IS VERY SEVERELY NOT OPTIMAL!
    for (let i = 0; i < layout.length; i++) {
      for (let j = 0; j < layout[i].length; j++) {
        let item = layout[i][j];
        this.cells.push(
          new layout[i][j].constructor(
            item.x,
            item.y,
            item.width,
            item.height,
            this,
            ...(layout[i][j].args || [])
          )
        );
        this.cells[this.cells.length - 1].parent = this;
      }
    }
    this.update();
  }
  update() {
    this.cells.forEach((cell) => (cell.updateNeighbors(), cell.update()));
  }
  /**
   * Calls each cell's draw function, then draws borders around them.
   * I draw borders after so that the cell dimensions are always clearly defined.
   */
  draw() {
    // Compute bounds
    let startX = Math.floor(this.x * process.stdout.columns) + 1;
    let startY = Math.floor(this.y * process.stdout.rows) + 1;
    let maxW = Math.floor(this.width * process.stdout.columns);
    let maxH = Math.floor(this.height * process.stdout.rows);
    // Make sure the cells are the correct sizes
    for (let i = 0; i < this.cells.length; i++) {
      this.cells[i] = verifyDimensions(this.cells[i]);
    }
    this.cells.forEach((cell) => {
      let sx = startX + Math.floor(cell.x * maxW);
      let sy = startY + Math.floor(cell.y * maxH);
      let w = Math.floor(cell.width * maxW);
      let h = Math.floor(cell.height * maxH);
      cell.draw(sx + 1, sy + 1, w - 2, h - 2);
      process.stdout.write("\x1b[?1049h");
      box(sx, sy, w, h, CHARS);
      write(
        ` ${cell.constructor.name.replaceAll("_", " ")} `,
        w,
        h,
        sx + 2,
        sy
      );
    });
  }
}

// This needs to be a seperate function because ESLint won't let me make a promise executor async
// Because finding a way to make the squiggly line go away is always more important than figuring
// out what's actually wrong :)
async function _generateGroup(opts) {
  let layout = [];
  let scripts = {};
  // Get all the user-defined classes into a state that we can actually use it
  for (let i = 0; i < opts.scripts.length; i++) {
    let script = opts.scripts[i];
    let s = await import("./" + script + ".js");
    Object.keys(s).forEach((sc) => (scripts[sc] = s[sc]));
  }
  // Create the cells!
  for (let x = 0; x < opts.layout.length; x++) {
    for (let y = 0; y < opts.layout[x].length; y++) {
      let c = opts.layout[x][y];
      if (scripts[c.type] === undefined)
        throw new Error(
          "Attempted to create a widget that does not exist: " + c.type
        );
      layout[x] = layout[x] ?? [];
      let args = [
        c.x,
        c.y,
        c.width,
        c.height,
        null,
        ...(opts.layout[x][y].args ?? [])
      ];
      layout[x][y] = new (scripts[c.type] ?? Cell)(...args);
      layout[x][y].args = opts.layout[x][y].args;
    }
  }
  return new CellGroup(0, 0, 1, 1, layout);
}

/**
 * @typedef {Object} PrimitiveCell
 * @property {String} type - Class name of custom cell
 * @property {number} x - X position
 * @property {number} y - Y position
 * @property {number} width - Width
 * @property {number} height - Height
 * @property {Array<String>} args - Arguments to pass to consturctor
 */

/**
 * This is a big boy function, it turns the JSON options into a cell group.
 * @param {Array<String>} scripts - Script files to load. IMPORTANT: DO NOT INCLUDE .JS - IT IS ADDED
 * AUTOMATICALLY
 * @param {Array<Array<PrimitiveCell>>} layout - Layout. Currently, all dimensions/coordinates must
 * fit EXACTLY into a [1,1] box-- this will change later.
 */
async function generateGroup(opts) {
  return new Promise((res) => _generateGroup(opts).then((r) => res(r)));
}

const optToChar = {
  horizontal: "h",
  vertical: "v",
  topLeft: "tl",
  topRight: "tr",
  bottomLeft: "bl",
  bottomRight: "br",
  crossUp: "cu",
  crossRight: "cr",
  crossDown: "cd",
  crossLeft: "cl",
  crossCenter: "c"
};

/**
 * Initialize jstop
 * @param {number} interval - Interval to update/draw on
 */
export async function init(interval = 250, configPath = "./config.json") {
  // TODO: CLI Arguments
  OPTS = JSON.parse(readFileSync(configPath));
  if (OPTS.characters)
    Object.keys(OPTS.characters).forEach(
      (key) =>
        (CHARS[optToChar[key]] = OPTS.characters[key] ?? CHARS[optToChar[key]])
    );
  let g = await generateGroup(OPTS);
  setInterval(() => {
    g.update();
    g.draw();
    hideCursor();
  }, interval);
}

if (
  process.argv?.[1] === fileURLToPath(import.meta.url) ||
  process.argv?.[1] + ".js" === fileURLToPath(import.meta.url)
) {
  clear();
  init(250);
}

export default {
  clear,
  cursorTo,
  write,
  showCursor,
  hideCursor,
  init,
  graph,
  removeAnsiCodes,
  color,
  getColorString,
  Cell,
  CellGroup
};

function exit() {
  showCursor();
  process.exit();
}

process.on("SIGINT", exit);
