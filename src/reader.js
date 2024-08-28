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
    while (true) {
      let pos = -1
      for (const delimiter of delimiters) {
        const i = block.indexOf(delimiter)
        if (i === -1) continue
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
        continue
      }
      buffer = block;
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

module.exports = {
  EOFError,
  readUntilDelimiter,
}
