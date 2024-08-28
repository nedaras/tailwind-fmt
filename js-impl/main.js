const fs = require('fs')
const { loadTailwindConfig } = require('./tailwind/config.js')

class EOFError extends Error {
  constructor() {
    super('EOF')
  }
}

const args = getArguments()

if (!args.output) {
  process.exit(1)
}

if (!args.input) {
  process.exit(1)
}

(async () => {
  const { context } = await loadTailwindConfig(process.cwd(), null, null);

  const writer = fs.createWriteStream(args.output, { encoding: 'utf8' })
  const reader = fs.createReadStream(args.input, { encoding: 'utf8' })

  let quote = false;
  readUntilDelimiter(reader, '"', (err, block) => {
    // js err handling is bad
    switch (true) {
      case (err == null):
        break
      case (err instanceof EOFError):
        writer.write(block)
        return
      default:
        throw err
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
})();

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

/**
 * @param {fs.ReadStream} stream
 * @param {string} delimitor
 * @param {function(?Error, string): void} callback 
 */
function readUntilDelimiter(stream, delimitor, callback) {
  let buffer = ''

  stream.on('data', block => {
    while (true) {
      const pos = block.indexOf(delimitor)
      if (pos !== -1) {
        callback(null, buffer + block.slice(0, pos))
        block = block.slice(pos + 1)
        continue
      }
      buffer = block;
      break
    }
  })

  stream.on('end', () => {
    callback(new EOFError(), buffer)
  })

  stream.on('error', err => {
    callback(err, '')
  })
}
