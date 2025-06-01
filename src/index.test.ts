import { expect, test } from "bun:test"

import { rainbeamToPo, wei18nToPo } from "./index.ts"

test("rainbeam i18n to po", async () => {
  expect(
    rainbeamToPo(
      {
        name: "hello",
        version: "0.1",
        data: {
          key1: "Key 1",
          key2: "Key 2",
        },
      },
      "en-US",
    ),
  ).toMatchSnapshot()
  expect(
    rainbeamToPo(
      {
        name: "hello",
        version: "0.1",
        data: {
          key1: "金鑰 1",
          key2: "金鑰 2",
        },
      },
      "zh-TW",
      {
        name: "hello",
        version: "0.1",
        data: {
          key1: "Key 1",
          key2: "Key 2",
        },
      },
    ),
  ).toMatchSnapshot()
})

test("webextension i18n to po", async () => {
  expect(
    wei18nToPo(
      {
        key1: { message: "Key 1" },
        key2: { message: "Key 2" },
      },
      "en-US",
    ),
  ).toMatchSnapshot()
  expect(
    wei18nToPo(
      {
        key1: { message: "金鑰 1" },
        key2: { message: "金鑰 2" },
      },
      "zh-TW",
      [
        {
          key1: { message: "Key 1" },
          key2: { message: "Key 2" },
        },
      ],
    ),
  ).toMatchSnapshot()
})
