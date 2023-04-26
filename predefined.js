import jstop from "./index.js";
import si from "systeminformation";
import { exec } from "node:child_process";

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
Model: ${data.model}
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
    this.setDraw(function (startX, startY, w, h) {
      exec(this.cmd, (_e, stdout) => {
        jstop.clear(startX, startY, w, h);
        jstop.write(stdout, w, h, startX, startY);
        // Some commands will end with a show cursor command, so this fixes that
        jstop.hideCursor();
      });
    });
  }
}
