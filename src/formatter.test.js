import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import fs from 'fs/promises'
import { fmtFile } from './cli'

const input = [
  `<button class="text-white px-4 sm:px-8 py-2 sm:py-3 bg-sky-700 hover:bg-sky-800">...</button>`,
  `<div class="text-gray-700 shadow-md p-3 border-gray-300 ml-4 h-24 flex border-2">`,
  `<div class='hover:opacity-75 opacity-50 hover:scale-150 scale-125'>`,
  `<div class="p-3 shadow-xl select2-dropdown">`,
]

const expected= [
  `<button class="bg-sky-700 px-4 py-2 text-white hover:bg-sky-800 sm:px-8 sm:py-3">...</button>`,
  `<div class="ml-4 flex h-24 border-2 border-gray-300 p-3 text-gray-700 shadow-md">`,
  `<div class='scale-125 opacity-50 hover:scale-150 hover:opacity-75'>`,
  `<div class="select2-dropdown p-3 shadow-xl">`,
]

let tmp

beforeAll(() => {
  tmp = require('fs').mkdtempSync('tmp')
})

afterAll(() => {
  require('fs').rmdirSync(tmp)
})

describe('format', async () => {

  it('order classes', async () => {
    await Promise.all(input.map(async (v, i) => {
      expect(await format('order_classes#' + i, v)).toBe(expected[i])
    }))
  })

  it('escaped quotes', async () => {
      const out = await format('escaped_quotes', `<div class="text-white \\\\\\\" bg-black \\\" fixed \\\\"></div>`)
      expect(out).toBe(`<div class="\\\\\\\" \\\" \\\\ fixed bg-black text-white"></div>`)
  })

})

/**
 * @param {string} id 
 * @param {string} input
 * @returns {Promise<string>}
 */
async function format(id, input) {
  id += ".html"

  await fs.writeFile(id, input)
  await fmtFile(id, tmp)

  const out = await fs.readFile(id)
  await fs.unlink(id);

  return out.toString()
}
