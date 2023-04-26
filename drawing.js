export function hideCursor() {
  process.stdout.write("\x1b[?25l");
}

export function showCursor() {
  process.stdout.write("\x1b[?25h");
}

export function cursorTo(x, y) {
  process.stdout.write(`\x1b[${y};${x}H`);
}

export function color(r, g, b) {
  // TODO
  process.stdout.write(`\x1b[38;2;${r};${g};${b}m`);
}

export function write(string, w = Infinity, h = Infinity, x = null, y = null) {
  let arr = string.match(new RegExp(`(\\x1b\\[[^a-zA-Z]+..|.){1,${w}}`, "g"));
  if (arr === null) return;
  arr = arr.slice(0, h);
  if (x !== null && y !== null) cursorTo(x, y);
  process.stdout.write(arr[0]);
  let offset = 0;
  let m = arr[0].match("\n");
  if (m !== null) offset += m.length;
  for (let i = 1; i < arr.length; i++) {
    if (x !== null && y !== null) cursorTo(x, y + i + offset);
    process.stdout.write(arr[i]);
    m = arr[i].match("\n");
    if (m !== null) offset += m.length;
  }
}

export function clear(x = 1, y = 1, w = null, h = null) {
  if (w === null || h === null) return process.stdout.write("\x1b[2J");
  write(" ".repeat(Math.round(w * h)), w, h, x, y);
}

export function box(sx, sy, w, h, CHARS) {
  cursorTo(sx, sy);
  process.stdout.write(CHARS.tl + CHARS.h.repeat(w - 2) + CHARS.tr);
  for (let y = 1; y < h - 1; y++) {
    cursorTo(sx, sy + y);
    process.stdout.write(CHARS.v);
    cursorTo(sx + w - 1, sy + y);
    process.stdout.write(CHARS.v);
  }
  cursorTo(sx, sy + h - 1);
  process.stdout.write(CHARS.bl + CHARS.h.repeat(w - 2) + CHARS.br);
}

export function graph(data, xS, yS, width, height, opts) {
  let max = Math.max(...data);
  opts = opts ?? {};
  opts.color = opts.color ?? [255, 255, 255];
  opts.fill = opts.fill ?? false;
  opts.fillDir = opts.fillDir ?? -1;
  opts.char = opts.char ?? "*";
  opts.normalized = opts.normalized ?? true;
  if (!opts.normalized) max = 1;
  let char = opts.char;
  if (!Array.isArray(opts.color[0])) opts.color = [opts.color];
  let xStep = width / data.length;
  for (let i = 0; i < data.length - 1; i++) {
    let x = i * xStep + xS;
    let y = (1 - data[i] / max) * height + yS;
    let tX = (i + 1) * xStep + xS;
    let tY = (1 - data[i + 1] / max) * height + yS;
    let delta = [tX - x, tY - y];
    let length = Math.sqrt(delta[0] ** 2 + delta[1] ** 2);
    let dir = [delta[0] / length, delta[1] / length];
    for (let j = 0; j < length; j++) {
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
      } else write(char, 1, 1, Math.round(x), Math.round(y));
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
  graph
};
