'use strict'

// exportando como una propiedad
const utils = {
  // extractTags: extractTags
  // con ecma6 al tener una propiedad igual o con el mismo nombre al valor puedo evitar esta duplicidad
  extractTags
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

module.exports = utils
