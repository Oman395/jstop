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
  constructor(x, y, w, h, parent) {
    super(x, y, w, h, parent);
    this.setDraw(async function (startX, startY, w, h) {
      let str = "";
      let data = await si.cpuCurrentSpeed();
      jstop.clear(startX, startY, w, h);
      data.cores.forEach((core, i) => {
        str += `CPU${i.toString().padStart(2, "0")}${Math.floor(core)
          .toString()
          .padStart(5, " ")}%\n`;
      });
      jstop.write(str, w - 4, h - 2, startX + 2, startY + 1);
    });
  }
}

export class Command extends jstop.Cell {
  constructor(x, y, w, h, parent, cmd) {
    super(x, y, w, h, parent);
    // I don't think I need this, but eh, better safe than sorry
    this.cmd = cmd;
    this.setDraw(async function (startX, startY, w, h) {
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
  constructor(x, y, w, h, percent) {
    super(x, y, w, h, percent);
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
      let length = longest.length;
      jstop.write(logo, w, h, startX, startY);
      jstop.write(info, w, h, startX + length + 1, startY);
      jstop.hideCursor();
    });
  }
}

let test = new Neofetch(0, 0, 1, 1, 1);
test.draw();
