#!/usr/bin/env node
// -*- mode: typescript; -*-
import { readFileSync, realpathSync, writeFileSync, writeSync } from "node:fs"
import { parseArgs } from "node:util"
import { po } from "gettext-parser"
import { z } from "zod"

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
 * WebExtensions i18n messages.json content.
 * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/i18n/Locale-Specific_Message_reference
 */
const data = z.object({
  name: z.string(),
  version: z.string(),
  data: z.record(z.string()),
})
const gettextParserDataEntry = z.object({
  msgctxt: z.optional(z.string()),
  msgid: z.string(),
  msgid_plural: z.optional(z.string()),
  msgstr: z.array(z.string()),
  comments: z.optional(
    z.object({
      translator: z.optional(z.string()),
      reference: z.optional(z.string()),
      extracted: z.optional(z.string()),
      flag: z.optional(z.string()),
      previous: z.optional(z.string()),
    }),
  ),
  obsolete: z.optional(z.boolean()),
})
const gettextParserData = z.object({
  charset: z.string(),
  headers: z.record(z.string(), z.string()),
  translations: z.record(
    z.string(),
    z.record(z.string(), gettextParserDataEntry),
  ),
})
type Data = z.infer<typeof data>
type GettextParserData = z.infer<typeof gettextParserData>
type GettextParserDataEntry = z.infer<typeof gettextParserDataEntry>

/**
 * Take parsed `json` and return raw PO data.
 * If `source` is given, then `json` is the target text. Otherwise `json` is the
 * source text.
 */
function toPo(json: Data, locale: string, source?: Data) {
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
  for (const [key, text] of Object.entries(json.data)) {
    const resultEntry: GettextParserDataEntry = {
      msgctxt: key,
      msgid: source ? source.data[key] : text,
      msgstr: source ? [text] : [],
    }
    translations[key] = resultEntry
  }
  return po.compile(res)
}
function toJson(poValue: GettextParserData) {
  const res: Data = {
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

const helpText = `wei18n-po-conv

Usage:
  wei18n-po-conv -l locale -i <input file> -o <output file>:
    Convert input file to output file.
    If input file name ends in .json, convert it from WebExtensions JSON to
      Gettext PO and write the resulting PO to output file.
    Otherwise, try to convert it from PO to JSON.

  When converting from JSON to PO, positional arguments are all used to specify
  reference files, like for source text.

Options:
  --help: show help (this message)`

async function main() {
  const parsedArgs = parseArgs({
    allowPositionals: true,
    options: {
      locale: { type: "string", short: "l" },
      input: { type: "string", short: "i" },
      output: { type: "string", short: "o" },
      help: { type: "boolean" },
    },
  })
  const { help, input, output, locale } = parsedArgs.values
  if (help) {
    console.log(helpText)
    process.exit(0)
  }
  if (input === undefined || output === undefined || locale === undefined) {
    console.log(helpText)
    process.exit(1)
  }
  if (input.endsWith(".json")) {
    const dataValue = data.parse(
      JSON.parse(readFileSync(input, { encoding: "utf-8" })),
    )
    const source = parsedArgs.positionals[0]
    const sourceValue = source
      ? data.parse(JSON.parse(readFileSync(source, { encoding: "utf-8" })))
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
