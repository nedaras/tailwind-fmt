#!/usr/bin/env node
"use strict";

// todo: use as less deps as possible

const fs = require('fs')
const { glob } = require('glob') // dont like the warning it is throwing on install // todo: there is fs glob
const { loadTailwindConfig, getConfigPath } = require('./tailwind/config.js');
const { readUntilDelimiter, EOFError } = require('./reader.js');

let context
async function main() {
  if (process.argv[2]) {
    processArgs(process.argv.slice(2))
    return
  }

  let tmp = undefined
  try {
    const configPath = getConfigPath({}, process.cwd())
    context = (await loadTailwindConfig(process.cwd(), configPath, null)).context

    const [ files, _tmp ] = await Promise.all([
      glob(context.tailwindConfig.content.files, { ignore: 'node_modules/**' }),
      fs.promises.mkdtemp("tmp"),
    ])

    tmp = _tmp

    const promises = files.map(async file => fmtFile(file, tmp).then((changed) => {
      changed && console.log(file)
    }))

    await Promise.all(promises)
  } finally {
    // remove on process exit
    tmp && fs.rmdirSync(tmp)
  }
}


/**
 * @param {string[]} args 
 */
function processArgs(args) {
  const { name, version }= require('../package.json')
  if (args[0] == '-v' || args[0] == '--version') {
    console.log(version)
    return
  }

  console.log("")

  console.log(`${name} v${version}`)
  console.log('\nUsage:')
  console.log(`   ${name}`)
  console.log('\nOptions:')
  console.log('   -v, --version    Print version number and exit')
  console.log('   -h, --help       Print usage information and exit') // its just an illusion

  console.log("")
}

process.on('SIGINT', () => {
  // for now we will just not exit
})

/**
 * @param {string} file 
 * @param {string} tmp 
 * @returns {Promise<boolean>}
 */
async function fmtFile(file, tmp) { // add like a check if we even needed to fmt mb tailwind has some kind of cache for changed files
  const output = tmp + "/" + file.replace(/[/\\]/g, '#')

  const reader = fs.createReadStream(file, { encoding: 'utf8' })
  const writer = fs.createWriteStream(output, { encoding: 'utf8' })

  let queote = false
  let changed = false

  return new Promise((resolve, reject) => {
    // escaped chars are handled by this function
    readUntilDelimiter(reader, [ '"', "'" ], (err, block, delimiter) => {
      // js err handling is bad
      switch (true) {
        case (err == null):
          break
        case (err instanceof EOFError):
          try {
            writer.write(block)

            reader.close()
            writer.close()
          } catch(err) {
            reject(err)
          }

          if (changed) {
            fs.rename(output, file, err => err ? reject(err) : resolve(changed))
          } else {
            fs.unlink(output, err => err ? reject(err) : resolve(changed))
          }

          return
        default:
          reject(err)
      }

      if (queote) {
        queote = false

        if (block === '') {
          writer.write(delimiter);
          return ["'", '"']
        }

        // todo: mb add some white spaces in future under a flag
        if (block.includes('\n')) {
          block = block.replaceAll('\n', ' ')
          changed = true
        }

        const classes = block.split(' ').filter(v => {
          if (v !== '') {
            return true
          }
          changed = true
          return false
        })

        const ordered = order(context.getClassOrder(classes))

        !changed && classes.forEach((v, i) => {
          v != ordered[i] && (changed = true)
        })

        writer.write(ordered.join(' ') + delimiter)

        return ["'", '"']
      }

      if (block.endsWith('class=')) {
        queote = true
        writer.write(block + delimiter)

        return [delimiter]
      }

      writer.write(block + delimiter)
    })
  })
}

function order(classOrder) { // do not look at this mess never
  const ordered = []
  const nulls = []
  
  let min = Number.MAX_VALUE
  for (const [ className, i ] of classOrder) {
    if (i == null) {
      nulls.push(className)
      continue
    }
    ordered[i] = className
    min = Math.min(min, Number(i)) // unsafe but cmon its js
  }

  const shifts = min - nulls.length
  if (shifts > 0) {
    ordered.splice(0, shifts)
  } else {
    ordered.unshift(...Array.from({ length: shifts * -1 }))
  }

  for (let i = 0; i < nulls.length; i++) {
    ordered[i] = nulls[i]
  }

  return ordered
}

main()

module.exports = {
  fmtFile
}
