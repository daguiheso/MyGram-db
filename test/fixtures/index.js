'use strict'

const uuid = require('uuid-base62')

const fixtures = {
  // Utilidad para crear imagenes
  getImage () {
    return {
      description: 'an #awesome picture with #tags #relax',
      url: `http://mygram.test/${uuid.v4()}.jpg`,
      likes: 0,
      liked: false,
      user_id: uuid.uuid()
    }
  },
  // Utilidad para crear multiples imagenes
  getImages (n) {
    let images = []
    while (n-- > 0) {
      images.push(this.getImage())
    }

    return images
  }
}

module.exports = fixtures
