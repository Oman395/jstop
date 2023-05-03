const ansiRegex = new RegExp(
  [
    "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
    "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))"
  ].join("|"),
  "gm"
);
/**
 * Take a wild guess
 */
export function hideCursor() {
  process.stdout.write("\x1b[?25l");
}

/**
 * Take a wild guess
 */
export function showCursor() {
  process.stdout.write("\x1b[?25h");
}

/**
 * Move cursor to position. Note that in the terminal, 1,1 is the minimum coordinate.
 * @param {number} x - Column to go to
 * @param {number} y - Row to go to
 */
export function cursorTo(x, y) {
  process.stdout.write(`\x1b[${y};${x}H`);
}

export function getColorString(r, g, b) {
  return g === undefined ? `\x1b[38;5;${r}m` : `\x1b[38;2;${r};${g};${b}m`;
}

/**
 * Color text. Currently only supports RGB values.
 * Note: MAKE SURE ALL COLORS ARE INTEGERS!
 * @param {number} r - Red value to use, 0-255, or the 256 color ID
 * @param {number} [g] - Green value to use, 0-255
 * @param {number} [b] - Blue value to use, 0-255
 */
export function color(r, g, b) {
  process.stdout.write(getColorString(r, g, b));
}

export function removeAnsiCodes(str) {
  // Pattern shamelessly stolen from https://github.com/chalk/ansi-regex
  // Here's its license:
  /*
    MIT License

    Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (https://sindresorhus.com)

    Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
  */
  return str.replaceAll(ansiRegex, "");
}

/**
 * Probably the most called function I've written here. This takes in a string, and prints it such that it fits within a set of borders. X and Y should probably be before width and height in the params, but I don't want to edit every single time I've called it.
 * @param {string} string - String to print.
 * @param {number} [w] - Width of space
 * @param {number} [h] - Height of space
 * @param {number} [x] - X coordinate of space's corner
 * @param {number} [y] - Y coordinate of space's corner
 */
export function write(string, w = Infinity, h = Infinity, x = null, y = null) {
  // Get an array of w sized strings so that we don't exceed the width
  // We do it in this slow way because otherwise we would have issues with ANSI escape sequences
  let arr = string.match(new RegExp(`([^\n]{1,${w}})`, "gm"));
  // This fixes more bugs than you'd expect
  if (arr === null) return;
  // Remove anything that would go too far down
  arr = arr.slice(0, h);
  if (x !== null && y !== null) cursorTo(x, y);
  // Write the first string. We have to do it this way because of newline weirdness
  process.stdout.write(arr[0]);
  // Offset is needed in case strings are given with newlines included
  let offset = 0;
  // Get number of newlines
  let m = arr[0].match("\n");
  if (m !== null) offset += m.length;
  for (let i = 1; i < arr.length; i++) {
    if (x !== null && y !== null) cursorTo(x, y + i + offset);
    process.stdout.write(arr[i]);
    // Again, get number of newlines
    m = arr[i].match("\n");
    if (m !== null) offset += m.length;
  }
}

/**
 * Handy clear function. If no arguments are passed, it will just clear normally.
 * @param {number} x - X coordinate to start clearing from
 * @param {number} y - Y coordinate to start clearing from
 * @param {number} w - Width to clear
 * @param {number} h - Height to clear
 */
export function clear(x = 1, y = 1, w = null, h = null) {
  // If w/h/x/y aren't passed, clear screen normally
  if (w === null || h === null) return process.stdout.write("\x1b[2J");
  // Otherwise, clear with spaces
  // This makes the clearing look better for the user, for some reason
  write(" ".repeat(Math.round(w * h)), w, h, x, y);
}

/**
 * Draw box. I'd document CHARS but it's a pain in the ass; just look in the code if you really need to know.
 * @param {number} sx - Start X of box
 * @param {number} sy - Start Y of box
 * @param {number} w - Width of box
 * @param {number} h - Height of box
 * @param {Object} CHARS - Characters.
 */
export function box(sx, sy, w, h, CHARS) {
  cursorTo(sx, sy);
  // Top border
  process.stdout.write(CHARS.tl + CHARS.h.repeat(w - 2) + CHARS.tr);
  // Walls
  for (let y = 1; y < h - 1; y++) {
    cursorTo(sx, sy + y);
    process.stdout.write(CHARS.v);
    cursorTo(sx + w - 1, sy + y);
    process.stdout.write(CHARS.v);
  }
  // Bottom border
  cursorTo(sx, sy + h - 1);
  process.stdout.write(CHARS.bl + CHARS.h.repeat(w - 2) + CHARS.br);
}

/**
 * Graph an array of datapoints. Data points can be normalized by you or by the script, depending on
 * settings.
 * @param {Array<number>} data - Data to plot
 * @param {number} xS - Starting X position
 * @param {number} yS - Starting Y position
 * @param {number} width - Maximum width
 * @param {number} height - Maximum height
 * @param {object} opts - Options
 * @param {Array<number> | Array<Array<number>>} opts.color - Either a single color, [r,g,b], or an array of them.
 * @param {boolean} opts.fill - Whether to fill from the line down/up
 * @param {number} opts.fillDir - Fill direction. -1 fills down, 1 fills up.
 * @param {string} opts.char - Character to use for drawing
 * @param {boolean} opts.normalized - Whether the script should normalize the values.
 */
export function graph(data, xS, yS, width, height, opts) {
  // Used to normalize data
  let max = Math.max(...data);
  // Make sure that nothing in opts is undefined
  opts = opts ?? {};
  opts.color = opts.color ?? [255, 255, 255];
  opts.fill = opts.fill ?? false;
  opts.fillDir = opts.fillDir ?? -1;
  opts.char = opts.char ?? "*";
  opts.normalized = opts.normalized ?? true;
  // This is just a shitty hack lol
  if (!opts.normalized) max = 1;
  // I used to pass char as a parameter, and I don't feel like doing the
  // find/replace
  let char = opts.char;
  // Allow people to pass [r,g,b] rather than [[r,g,b]] if they only want a solid color
  if (!Array.isArray(opts.color[0])) opts.color = [opts.color];
  let xStep = width / data.length;
  // We iterate 1 less than the data length, because we draw from the current item to the next
  for (let i = 0; i < data.length - 1; i++) {
    // Starting position
    let x = i * xStep + xS;
    // We need to do 1 - data[i] because terminal coordinates are inverted
    let y = (1 - data[i] / max) * height + yS;
    // Target position
    let tX = (i + 1) * xStep + xS;
    let tY = (1 - data[i + 1] / max) * height + yS;
    // Set up directions
    let delta = [tX - x, tY - y];
    let length = Math.sqrt(delta[0] ** 2 + delta[1] ** 2);
    let dir = [delta[0] / length, delta[1] / length];
    // Draw the line from the start to the target
    for (let j = 0; j < length; j++) {
      // Fill will either go from each point up to the upper bound, or to the lower bound.
      // We do this by literally just printing out extra characters 1 by 1.
      if (opts.fill) {
        // !! THIS IS A TERRIBLE WAY TO DO THIS !!
        // This is _very slow_ and causes issues at high refresh rate with a large graph. I need to color it
        // along the gradient specified, but which means that I can't just get a certain number of characters
        // and print them, so the only other way I can think to do this is to generate sets of characters for
        // each band of color; I could do that, but I really don't want to, and it's Good Enough(tm). I could
        // also maybe fill upwards from the graph, and simply not clear at all, so there's options-- I'm just
        // too lazy.
        //
        // TODO: Fix this
        if (opts.fillDir < 0) {
          for (let pos = Math.round(y); pos >= yS; pos--) {
            let col =
              opts.color[Math.round(opts.color.length * (pos / height))] ??
              opts.color[opts.color.length - 1];
            color(...col);
            write(char, 1, 1, Math.round(x), pos);
          }
        } else {
          for (let pos = yS + height; pos >= Math.round(y); pos--) {
            let col =
              opts.color[Math.round(opts.color.length * (pos / height))] ??
              opts.color[opts.color.length - 1];
            color(...col);
            write(char, 1, 1, Math.round(x), pos);
          }
        }
      } else {
        let c = opts.color[Math.round((opts.color.length - 1) * (y / height))];
        color(...c);
        write(char, 1, 1, Math.round(x), Math.round(y));
      }
      x += dir[0];
      y += dir[1];
    }
  }
}

export default {
  hideCursor,
  showCursor,
  cursorTo,
  write,
  clear,
  graph,
  removeAnsiCodes,
  color,
  getColorString
};
