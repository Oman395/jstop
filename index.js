import { readFileSync } from "fs";
import {
  hideCursor,
  showCursor,
  write,
  clear,
  cursorTo,
  graph,
  box
} from "./drawing.js";

const OPTS = JSON.parse(readFileSync("./layout.json"));

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
};

function getNeighbors(cell, group) {
  let neighbors = {
    up: [],
    down: [],
    left: [],
    right: []
  };
  group.forEach((c) => {
    if (c.y + c.height === cell.y) neighbors.down.push(c);
    else if (c.y === cell.y + cell.height) neighbors.up.push(c);
    else if (c.x + c.width === cell.x) neighbors.left.push(c);
    else if (c.x === cell.x + cell.width) neighbors.right.push(c);
  });
  return neighbors;
}

function verifyDimensions(cell) {
  cell.neighbors.right.forEach((n) => {
    let deltaR = cell.x + cell.width - n.x;
    cell.width -= deltaR;
  });
  cell.neighbors.up.forEach((n) => {
    let deltaU = cell.y + cell.height - n.y;
    cell.height += deltaU;
  });
  if (cell.right === null) cell.width += 1.0 - (cell.x + cell.width);
  if (cell.left === null) (cell.width += cell.y), (cell.y = 0);
  if (cell.top === null) cell.height += 1.0 - (cell.y + cell.height);
  if (cell.bottom === null) (cell.height += cell.y), (cell.y = 0);
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
  draw(startX, startY, w, h) {
    // TODO: Make sure everything has actual color options so I don't need to do this, which could cause
    // issues under certain circumstances
    process.stdout.write("\x1b[0m");
    this.#draw(startX, startY, w, h);
  }
  setDraw(func) {
    this.#draw = func;
  }
  constructor(x, y, w, h, parent) {
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
    this.parent = parent;
    this.upCount = 0;
  }
  updateNeighbors() {
    this.neighbors = getNeighbors(this, this.parent.cells);
  }
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
      this.neighbors[key].forEach((n) => (n = verifyDimensions(n)))
    );
  }
  update() {
    this.upCount++;
  }
}

export class CellGroup {
  constructor(x, y, w, h, layout) {
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
    this.cells = [];
    // For now, we'll just assume that layout is already formatted correctly.
    // TODO: THIS IS VERY SEVERELY NOT OPTIMAL!!!!!
    for (let i = 0; i < layout.length; i++) {
      for (let j = 0; j < layout[i].length; j++) {
        let item = layout[i][j];

        this.cells.push(
          new layout[i][j].constructor(
            item.x,
            item.y,
            item.width,
            item.height,
            this
          )
        );
      }
    }
    this.update();
  }
  update() {
    this.cells.forEach((cell) => (cell.updateNeighbors(), cell.update()));
  }
  draw() {
    let startX = Math.floor(this.x * process.stdout.columns) + 1;
    let startY = Math.floor(this.y * process.stdout.rows) + 1;
    let maxW = Math.floor(this.width * process.stdout.columns);
    let maxH = Math.floor(this.height * process.stdout.rows);
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
    });
  }
}

async function _generateGroup(opts) {
  let layout = [];
  let scripts = {};
  for (let i = 0; i < Object.keys(opts.scripts).length; i++) {
    let script = Object.keys(opts.scripts)[i];
    let s = await import("./" + script + ".js");
    Object.keys(s).forEach((sc) => (scripts[sc] = s[sc]));
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
      }
    }
  }
  return new CellGroup(0, 0, 1, 1, layout);
}

async function generateGroup(opts) {
  return new Promise((res) => _generateGroup(opts).then((r) => res(r)));
}

export async function init(interval = 250) {
  let g = await generateGroup(OPTS);
  setInterval(() => {
    g.update();
    g.draw();
  }, interval);
}

clear();
init(250);

export default {
  clear,
  cursorTo,
  write,
  showCursor,
  hideCursor,
  init,
  graph,
  Cell,
  CellGroup
};
