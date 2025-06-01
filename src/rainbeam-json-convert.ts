#!/usr/bin/env node
// -*- mode: typescript; -*-
import { readFileSync, realpathSync, writeFileSync, writeSync } from "node:fs"
import { parseArgs } from "node:util"
import { po } from "gettext-parser"
import { z } from "zod"
import type { GettextParserData, GettextParserDataEntry } from "./gettext"

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
    writeSync(process.stderr.fd, err.stack || err.message)
    process.exitCode = 1
  })
}

/**
 * Rainbeam translation json object.
 */
const rainbeamI18nData = z.object({
  name: z.string(),
  version: z.string(),
  data: z.record(z.string()),
})
type RainbeamI18nData = z.infer<typeof rainbeamI18nData>

/**
 * Take parsed `json` and return raw PO data.
 * If `source` is given, then `json` is the target text. Otherwise `json` is the
 * source text.
 */
function toPo(
  json: RainbeamI18nData,
  locale: string,
  source?: RainbeamI18nData,
) {
  const translations: Record<string, GettextParserDataEntry> = {}
  const res: GettextParserData = {
    charset: "utf-8",
    headers: {
      "Project-Id-Version": "placeholder",
      "mime-version": "1.0",
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Transfer-Encoding": "8bit",
      "Plural-Forms": "nplurals=1; plural=0",
      Language: locale,
    },
    translations: { "": translations },
  }
  // prioritize source, in case source has more entries.
  for (const [key, text] of Object.entries((source ?? json).data)) {
    const resultEntry: GettextParserDataEntry = {
      msgctxt: key,
      msgid: source ? source.data[key] : text,
      // If source is given, json is the target text, fill it in
      msgstr: source ? [json.data[key]] : [],
    }
    translations[key] = resultEntry
  }
  return po.compile(res)
}
function toJson(poValue: GettextParserData) {
  const res: RainbeamI18nData = {
    name: "out",
    version: "0.0.0",
    data: {},
  }
  for (const [context, objects] of Object.entries(poValue.translations)) {
    for (const [msgid, entry] of Object.entries(objects)) {
      if (msgid === "") continue
      res.data[context] = entry.msgstr.join("")
    }
  }
  return JSON.stringify(res, null, 2) + "\n"
}

const helpText = `rainbeam-json-convert.ts

Usage:
  rainbeam-json-convert.ts -l locale -i <input file> -o <output file>:
    Convert input file to output file.
    If input file name ends in .json, convert it from Rainbeam's JSON to
      Gettext PO and write the resulting PO to output file.
      Use -s to specify source text.
    Otherwise, try to convert it from PO to JSON.

Options:
  --help: show help (this message)

Examples:
  Prepare a partially translated JSON file for translation:
    bun src/rainbeam-json-convert.ts \
    -i ~/git/rainbeam/langs/zh-TW.json \
    -s ~/git/rainbeam/langs/en-US.json \
    -o /tmp/zh-tw.po \
    -l zh_TW

  Convert a translated PO file into JSON:
    bun src/rainbeam-json-convert.ts \
    -i /tmp/zh-tw.po \
    -o ~/git/rainbeam/langs/zh-TW.json
`

async function main() {
  const parsedArgs = parseArgs({
    options: {
      locale: { type: "string", short: "l" },
      input: { type: "string", short: "i" },
      source: { type: "string", short: "s" },
      output: { type: "string", short: "o" },
      help: { type: "boolean" },
    },
  })
  const { help, input, output, locale, source } = parsedArgs.values
  if (help) {
    console.log(helpText)
    process.exit(0)
  }
  if (input === undefined || output === undefined || locale === undefined) {
    console.log(helpText)
    process.exit(1)
  }
  if (input.endsWith(".json")) {
    const dataValue = rainbeamI18nData.parse(
      JSON.parse(readFileSync(input, { encoding: "utf-8" })),
    )
    const sourceValue = source
      ? rainbeamI18nData.parse(
          JSON.parse(readFileSync(source, { encoding: "utf-8" })),
        )
      : undefined
    writeFileSync(output, toPo(dataValue, locale, sourceValue))
  } else {
    const poValue = po.parse(readFileSync(input, { encoding: "utf-8" }))
    writeFileSync(output, toJson(poValue))
  }
}

if (realpathSync(process.argv[1]) === import.meta.filename) {
  main()
}
