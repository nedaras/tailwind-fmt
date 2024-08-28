const fs = require('fs')
const { glob } = require('glob')
const { loadTailwindConfig, getConfigPath } = require('./tailwind/config.js');
const { readUntilDelimiter, EOFError } = require('./reader.js');

let context
(async () => {
  const configPath = getConfigPath({}, process.cwd())
  context = (await loadTailwindConfig(process.cwd(), configPath, null)).context

  const [ files, tmp ] = await Promise.all([
    glob(context.tailwindConfig.content.files, { ignore: 'node_modules/**' }),
    require('fs/promises').mkdtemp("tmp"), // this can err that already is an dir
  ])

  try {
    const promises = files.map(async file => {
      return fmtFile(`./${file}`, `./${tmp}/${file}`).then(() => {
        console.log(file)
      })
    })
    await Promise.all(promises)
  } finally {
    // remove on process exit
    fs.rmdirSync(tmp)
  }
})();

process.on('SIGINT', () => {
  // for now we will just not exit
})

/**
 * @param {string} input 
 * @param {string} output 
 * @returns {Promise<void>}
 */
async function fmtFile(input, output) { // add like a check if we even needed to fmt mb tailwind has some kind of cache for changed files

  const reader = fs.createReadStream(input, { encoding: 'utf8' })
  const writer = fs.createWriteStream(output, { encoding: 'utf8' })

  return new Promise((resolve, reject) => {
    let quote = false;
    readUntilDelimiter(reader, '"', (err, block) => {
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

          fs.rename(output, input, err => err ? reject(err) : resolve())

          return
        default:
          reject(err)
      }

      if (quote) {
        quote = !quote;

        const classes = block.split(' ').filter(v => v !== '')
        const ordered = order(context.getClassOrder(classes))

        writer.write(ordered.join(' ') + '"')

        return
      }

      if (block.endsWith('class=')) {
        quote = !quote
      }

      writer.write(block + '"')
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

/**
 * @typedef {Object} Arguments
 * @property {?string} input
 * @property {?string} output
 */

/**
  * @return {Arguments}
  */
function getArguments() {
  const args = {}
  let len = process.argv.length

  for (let i = 0; i < len; i++) {
    if (process.argv[i] == '-i' && len > i + 1) {
      args.input = process.argv[++i]
    }

    if (process.argv[i] == '-o' && len > i + 1) {
      args.output = process.argv[++i]
    }
  }

  return args;
}
