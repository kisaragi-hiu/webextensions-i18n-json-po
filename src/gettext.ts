import { z } from "zod"

export const gettextParserDataEntry = z.object({
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
export const gettextParserData = z.object({
  charset: z.string(),
  headers: z.record(z.string(), z.string()),
  translations: z.record(
    z.string(),
    z.record(z.string(), gettextParserDataEntry),
  ),
})

export type GettextParserData = z.infer<typeof gettextParserData>
export type GettextParserDataEntry = z.infer<typeof gettextParserDataEntry>
