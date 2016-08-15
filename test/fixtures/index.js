'use strict'

const uuid = require('uuid-base62')

// Utilidad para crear imagenes

const fixtures = {
  getImage () {
    return {
      description: 'an #awesome picture with #tags #relax',
      url: `http://mygram.test/${uuid.v4()}.jpg`,
      likes: 0,
      liked: false,
      user_id: uuid.uuid()
    }
  }
}

module.exports = fixtures
