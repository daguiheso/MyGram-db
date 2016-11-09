'use strict'

const crypto = require('crypto')
// exportando como una propiedad
const utils = {
  // extractTags: extractTags
  // con ecma6 al tener una propiedad igual o con el mismo nombre al valor puedo evitar esta duplicidad
  extractTags,
  encrypt,
  normalize
}

function extractTags (text) {
  if (text == null) return [] // con doble == validamos si es null e indefinido a la vez

  let matches = text.match(/#(\w+)/g)

  if (matches === null) return []

  matches = matches.map(normalize)

  return matches
}

function normalize (text) {
  text = text.toLowerCase()
  text = text.replace(/#/g, '')
  return text
}

// Tecnica de encriptacion sha256
function encrypt (password) {
  // creamos un sha
  let shasum = crypto.createHash('sha256')
  // actualizar con el valor a encriptar
  shasum.update(password)
  // retorno de valor en hex
  return shasum.digest('hex')
}

module.exports = utils
