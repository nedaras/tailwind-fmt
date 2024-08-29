class EOFError extends Error {
  constructor() {
    super('EOF')
  }
}

/**
 * @param {fs.ReadStream} stream
 * @param {string[]} delimitors
 * @param {function(?Error, string, string): undefined | string[]} callback 
 */
function readUntilDelimiter(stream, delimiters, callback) { // todo to make it better set new delimeter to what is returned from callbacl
  let buffer = ''

  stream.on('data', block => {
    // mate this code a bit better looks nasty
    while (true) {
      let pos = -1
      for (const delimiter of delimiters) {
        let i = block.indexOf(delimiter)
        if (i === -1) continue
        if (delimiter === '"') {
          while (i !== -1 && isEscaped(buffer + block.slice(0, i))) {
            buffer += block.slice(0, i + 1)
            block = block.slice(i + 1)
            i = block.indexOf(delimiter)
          }
        }
        if (pos === -1) {
          pos = i
          continue
        }

        pos = Math.min(pos, i)
      }

      if (pos !== -1) {
        const r = callback(null, buffer + block.slice(0, pos), block[pos])
        r && (delimiters = r)

        block = block.slice(pos + 1)
        buffer = ''

        continue
      }
      buffer += block;
      break
    }
  })

  stream.on('end', () => {
    callback(new EOFError(), buffer, '')
  })

  stream.on('error', err => {
    callback(err, '', '')
  })
}

/**
 * @param {string} block 
 * @returns {boolean}
 */
function isEscaped(block) {
  let i = block.length - 1

  // if out of index js will just return undefined
  while (block[i] === '\\') {
    i--
  }

  return (block.length - i - 1) & 1
}

module.exports = {
  EOFError,
  readUntilDelimiter,
}
