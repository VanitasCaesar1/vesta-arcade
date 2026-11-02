// Terminal output. Everything goes through `out`, so the MCP server can send
// it to stderr (stdout carries the protocol there).
import { renderUnicodeCompact } from "uqr";

const color = process.stderr.isTTY && !process.env.NO_COLOR;
const wrap = (code: string) => (s: string) => (color ? `\x1b[${code}m${s}\x1b[0m` : s);

export const c = {
  bold: wrap("1"),
  dim: wrap("2"),
  ember: wrap("38;5;202"),
  gold: wrap("38;5;220"),
  green: wrap("32"),
  red: wrap("31"),
  cyan: wrap("36"),
};

export interface Out {
  log(msg?: string): void;
  progress(msg: string): void;
  done(): void;
}

export function terminalOut(stream: NodeJS.WriteStream = process.stdout): Out {
  let live = false;
  return {
    log(msg = "") {
      if (live) {
        stream.write("\r\x1b[2K");
        live = false;
      }
      stream.write(msg + "\n");
    },
    progress(msg) {
      if (!stream.isTTY) return;
      stream.write("\r\x1b[2K" + msg);
      live = true;
    },
    done() {
      if (live) stream.write("\r\x1b[2K");
      live = false;
    },
  };
}

export const silentOut: Out = { log() {}, progress() {}, done() {} };

export function stderrOut(): Out {
  return {
    log: (msg = "") => process.stderr.write(msg + "\n"),
    progress() {},
    done() {},
  };
}

export function qr(url: string): string {
  try {
    return renderUnicodeCompact(url, { border: 1 });
  } catch {
    return "";
  }
}

export function bytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export const FLAME = c.ember("▲");
