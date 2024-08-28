class EOFError extends Error {
  constructor() {
    super('EOF')
  }
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

module.exports = {
  EOFError,
  readUntilDelimiter,
}
