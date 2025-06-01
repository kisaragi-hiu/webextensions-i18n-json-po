import { expect, test } from "bun:test"
import { getLicense, getLicenseList } from "./get.ts"

// To actually register index.ts and other files for consideration
// Otherwise 0% tested is treated as 100% tested
import "./index.ts"

test("getting and parsing license list", async () => {
  expect(await getLicenseList()).toEqual(expect.anything())
})

const licenses = (await getLicenseList(true, true)).licenses
const sampleIndicies: Set<number> = new Set()
while (sampleIndicies.size < 5) {
  sampleIndicies.add(Math.floor(Math.random() * licenses.length))
}
const sampledLicenses = [...sampleIndicies].map((i) => licenses[i])

test.each(sampledLicenses.map((license) => [license.licenseId]))(
  "Can fetch and parse randomly sampled license: %s",
  async (id) => {
    expect(await getLicense(id)).toEqual(expect.anything())
  },
)
