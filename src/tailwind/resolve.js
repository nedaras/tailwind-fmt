// from https://github.com/tailwindlabs/prettier-plugin-tailwindcss/blob/main/src/resolve.ts

const req = require('node:module').createRequire

const localRequire = req(require('url').pathToFileURL(__filename).toString())

function resolveIn(id, paths) {
  return localRequire.resolve(id, {
    paths,
  })
}

module.exports = {
  resolveIn,
}
