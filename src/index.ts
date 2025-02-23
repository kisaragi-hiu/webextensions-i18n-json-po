#!/usr/bin/env node
import { writeSync, realpathSync } from "node:fs";
import { parseArgs } from "node:util";

// The default behavior on an uncaught exception is to print the source line
// with the error, then print the backtrace or message. Since we ship minified
// code, the "source" line is actually minified, and can easily take up half the
// window. Override the behavior to not do that.
//
// The backtrace is still kept since we should still be catching errors and
// showing our own error messages.
//
// Note that Bun.build runs this check at build time.
if (process.env.NODE_ENV === "production") {
  process.on("uncaughtException", (err) => {
    writeSync(process.stderr.fd, err.stack || err.message);
    process.exitCode = 1;
  });
}

async function main() {
  const parsedArgs = parseArgs({
    allowPositionals: true,
    options: {
      all: { type: "boolean" },
      force: { type: "boolean", short: "f" },
      list: { type: "boolean", short: "l" },
      open: { type: "boolean" },
      help: { type: "boolean" },
    },
  });
  if (parsedArgs.values.help) {
    console.log(`cmd name

Usage:
  cmd:
    desc
  ...

Options:
  --help:
    show help (this message)`);
  }
}

if (realpathSync(process.argv[1]) === import.meta.filename) {
  main();
}
