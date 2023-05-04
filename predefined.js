import jstop from "./index.js";
import si from "systeminformation";
import { exec } from "node:child_process";

function commandOutput(cmd) {
  return new Promise((res) => {
    exec(cmd, (_e, stdout) => {
      res(stdout);
    });
  });
}

// This is pretty much just a direct clone of every single gotop widget.
// This package is inspired heavily by gotop, so I want to be at the very least comperable in terms of widgets.

export class CPU extends jstop.Cell {
  constructor(x, y, w, h, parent, historyLength = 10) {
    super(x, y, w, h, parent);
    this.histories = [];
    this.setDraw(async function (startX, startY, w, h) {
      let str = "";
      let str2 = "";
      let data = await si.currentLoad();
      jstop.clear(startX, startY, w, h);
      data.cpus.forEach((core, i) => {
        if (this.histories[i] === undefined)
          this.histories[i] = new Array(historyLength).fill(0);
        this.histories[i].shift();
        this.histories[i].push(core.load / 100);
        jstop.graph(this.histories[i], startX, startY, w, h - 1, {
          color: [7 - ((i + 3) % 8)],
          normalized: false
        });
        str += `${jstop.getColorString(7 - ((i + 3) % 8))}CPU${i
          .toString()
          .padStart(2, "0")}\n`;
        str2 += `${jstop.getColorString(7 - ((i + 3) % 8))}${Math.floor(
          core.load
        ).toString()}%\n`;
      });
      jstop.write(str, w - 4, h - 2, startX + 2, startY + 1);
      jstop.write(str2, w - 12, h - 2, startX + 10, startY + 1);
      process.stdout.write("\x1b[0m"); // Clear formatting, just in case
    });
  }
}

export class Command extends jstop.Cell {
  constructor(x, y, w, h, parent, cmd) {
    super(x, y, w, h, parent);
    // I don't think I need this, but eh, better safe than sorry
    this.cmd = cmd;
    this.setDraw(async function (startX, startY, w, h) {
      process.stdout.write("\x1b[0m"); // Clear formatting, just in case
      let str = await commandOutput(this.cmd);
      jstop.clear(startX, startY, w, h);
      jstop.write(str, w, h, startX, startY);
      // Some commands will end with a show cursor command, so this fixes that
      jstop.hideCursor();
    });
  }
}

export class Neofetch extends jstop.Cell {
  // Neofetch renders super weirdly, so I just made this
  constructor(x, y, w, h, parent) {
    super(x, y, w, h, parent);
    this.setDraw(async function (startX, startY, w, h) {
      let logo = await commandOutput("neofetch -L");
      let info = await commandOutput("neofetch --off");
      let logoArr = logo.split("\n");
      // Reset formatting, just incase
      jstop.clear(startX, startY, w, h);
      process.stdout.write("\x1b[0m");
      let longest = logoArr.sort(function (a, b) {
        return (
          jstop.removeAnsiCodes(b).length - jstop.removeAnsiCodes(a).length
        );
      });
      let length = jstop.removeAnsiCodes(longest[0]).length;
      jstop.write(logo, w, h, startX, startY);
      jstop.write(info, w, h, startX + length + 1, startY);
      jstop.hideCursor();
      // Figure how large our new size should be
      let height = info.split("\n").length;
      let longest2 = info.split("\n").sort(function (a, b) {
        return (
          jstop.removeAnsiCodes(b).length - jstop.removeAnsiCodes(a).length
        );
      });
      let maximumW = length + jstop.removeAnsiCodes(longest2[0]).length + 1;
      this.updateDimensionsAbsoluteCoordinates(maximumW + 2, height);
    });
  }
}
