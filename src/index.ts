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
 * WebExtensions i18n messages.json content.
 * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/i18n/Locale-Specific_Message_reference
 */
const wei18n = z.record(
  z.string(),
  z.object({
    message: z.string(),
    description: z.optional(z.string()),
    placeholders: z.optional(
      z.record(
        z.string(),
        z.object({
          content: z.string(),
          example: z.optional(z.string()),
        }),
      ),
    ),
  }),
)
type Wei18n = z.infer<typeof wei18n>

/**
 * Take parsed `json` and return raw PO data.
 * If `source` is given, then `json` is the target text. Otherwise `json` is the
 * source text.
 */
export function rainbeamToPo(
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
function rainbeamToJson(poValue: GettextParserData) {
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
/**
 * Take parsed `json` and output the raw PO data.
 * If `referenceTexts` is given, also write that to the PO file for reference.
 */
export function wei18nToPo(
  json: Wei18n,
  locale: string,
  referenceTexts?: Wei18n[],
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
  for (const [key, entry] of Object.entries(json)) {
    const resultEntry: GettextParserDataEntry = {
      msgctxt: "",
      msgid: key,
      msgstr: [entry.message],
    }
    if (entry.description) {
      if (!resultEntry.comments) {
        resultEntry.comments = {}
      }
      resultEntry.comments.extracted = entry.description
    }
    if (referenceTexts) {
      for (const reference of referenceTexts) {
        if (reference[key]) {
          if (!resultEntry.comments) {
            resultEntry.comments = {}
          }
          if (!resultEntry.comments.translator) {
            resultEntry.comments.translator = reference[key].message
          } else {
            resultEntry.comments.translator = `${resultEntry.comments.translator}

${reference[key].message}`
          }
        }
      }
    }
    translations[key] = resultEntry
  }
  return po.compile(res)
}
function wei18nToJson(poValue: GettextParserData) {
  const res: Wei18n = {}
  for (const [msgid, entry] of Object.entries(poValue.translations[""])) {
    if (msgid === "") continue
    res[msgid] = {
      message: entry.msgstr.join(""),
      description: entry.comments?.extracted,
    }
  }
  return JSON.stringify(res, null, 2) + "\n"
}

const helpText = `wei18n-po-conv

Usage:
  wei18n-po-conv --mode [rainbeam|wei18n] -l locale -i <input file> -o <output file>:
    Convert input file to output file.
    If input file name ends in .json, convert it from JSON to
      Gettext PO and write the resulting PO to output file.
      Use -s to specify source text.
    Otherwise, try to convert it from PO to JSON.

Options:
  --mode [rainbeam|wei18n]:
    Convert for rainbeam or WebExtensions. Default is for WebExtensions.
  --help: show help (this message)

Examples:
  Prepare a partially translated Rainbeam JSON file for translation:
    wei18n-po-conv \\
    --mode rainbeam \\
    -i ~/git/rainbeam/langs/zh-TW.json \\
    -s ~/git/rainbeam/langs/en-US.json \\
    -o /tmp/zh-tw.po \\
    -l zh_TW

  Convert a translated PO file into Rainbeam JSON:
    wei18n-po-conv \\
    --mode rainbeam \\
    -i /tmp/zh-tw.po \\
    -o ~/git/rainbeam/langs/zh-TW.json
`

async function main() {
  const parsedArgs = parseArgs({
    options: {
      mode: { type: "string" },
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
  let mode = parsedArgs.values.mode
  if (mode === undefined) {
    mode = "wei18n"
  }
  if (mode !== "rainbeam" && mode !== "wei18n") {
    console.log("Mode must be 'rainbeam' or 'wei18n'")
    process.exit(1)
  }
  if (input === undefined || output === undefined || locale === undefined) {
    console.log(helpText)
    process.exit(1)
  }
  if (input.endsWith(".json")) {
    if (mode === "rainbeam") {
      const dataValue = rainbeamI18nData.parse(
        JSON.parse(readFileSync(input, { encoding: "utf-8" })),
      )
      const sourceValue = source
        ? rainbeamI18nData.parse(
            JSON.parse(readFileSync(source, { encoding: "utf-8" })),
          )
        : undefined
      writeFileSync(output, rainbeamToPo(dataValue, locale, sourceValue))
    } else if (mode === "wei18n") {
      const wei18nValue = wei18n.parse(
        JSON.parse(readFileSync(input, { encoding: "utf-8" })),
      )
      const sourceValue = source
        ? wei18n.parse(JSON.parse(readFileSync(source, { encoding: "utf-8" })))
        : undefined
      writeFileSync(
        output,
        wei18nToPo(
          wei18nValue,
          locale,
          sourceValue ? [sourceValue] : undefined,
        ),
      )
    }
  } else {
    // here, input does not end with .json
    if (mode === "rainbeam") {
      const poValue = po.parse(readFileSync(input, { encoding: "utf-8" }))
      writeFileSync(output, rainbeamToJson(poValue))
    } else if (mode === "wei18n") {
      const poValue = po.parse(readFileSync(input, { encoding: "utf-8" }))
      writeFileSync(output, wei18nToJson(poValue))
    }
  }
}

if (realpathSync(process.argv[1]) === import.meta.filename) {
  main()
}
