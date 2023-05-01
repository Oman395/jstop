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

export class CPU extends jstop.Cell {
  constructor(x, y, w, h, parent) {
    super(x, y, w, h, parent);
    // Initialize array to store the history of the CPU frequency
    this.cpuHist = new Array(20).fill(0);
    // This function sets the #draw property in the Cell base class, and needs to be used
    // for any custom cells to work.
    this.setDraw(async function (startX, startY, w, h) {
      // Reset formatting, just incase
      process.stdout.write("\x1b[0m");
      jstop.hideCursor();
      let data = await si.cpu();
      // Remove oldest bit of data from history, add newest
      this.cpuHist.shift();
      this.cpuHist.push(
        (data.speed - data.speedMin) / (data.speedMax - data.speedMin)
      );
      let d2 = await si.cpuTemperature();
      // Clear the drawable area
      jstop.clear(startX, startY, w, h);
      jstop.write(
        `Freq: ${data.speed}GHz / ${data.speedMax}GHz
Cores: ${data.cores}
Processors: ${data.processors}
Model: ${data.brand.replace(/^Gen /, "")}
Temp: ${d2.main}°C`,
        w,
        h,
        startX,
        startY
      );
      jstop.graph(this.cpuHist, startX, startY + 5, w, h - 6, {
        fill: true,
        fillDir: 1,
        normalized: false,
        scale: true,
        color: [
          [215, 2, 112],
          [215, 2, 112],
          [115, 79, 150],
          [0, 56, 168],
          [0, 56, 168]
        ],
        unit: "GHz"
      });
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
