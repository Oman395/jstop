import jstop from "./index.js";
import si from "systeminformation";
import { exec } from "node:child_process";

export class Test extends jstop.Cell {
  constructor(x, y, w, h, parent) {
    super(x, y, w, h, parent);
    this.setDraw(function (startX, startY, w, h) {
      jstop.clear(startX, startY, w, h);
      jstop.write(
        "ooo this is custom text ooo you like kissing boys don't you ooo you're a boykisser ooo",
        w,
        h,
        startX,
        startY
      );
    });
  }
}

export class CPU extends jstop.Cell {
  constructor(x, y, w, h, parent) {
    super(x, y, w, h, parent);
    this.cpuHist = new Array(20).fill(0);
    this.setDraw(async function (startX, startY, w, h) {
      process.stdout.write("\x1b[0m");
      jstop.hideCursor();
      let data = await si.cpu();
      this.cpuHist.shift();
      this.cpuHist.push(
        (data.speed - data.speedMin) / (data.speedMax - data.speedMin)
      );
      let d2 = await si.cpuTemperature();
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
  constructor(x, y, w, h, parent, command) {
    super(x, y, w, h, parent);
    this.cmd = command;
    this.setDraw(function (startX, startY, w, h) {
      exec(this.cmd || "neofetch", (_e, stdout) => {
        jstop.write(stdout, w, h, startX, startY);
      });
    });
  }
}
