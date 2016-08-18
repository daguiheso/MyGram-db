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
  },
  // Retorna user generico
  getUser () {
    return {
      name: 'A random user',
      username: `user_${uuid.v4()}`,
      password: uuid.uuid(),
      email: `${uuid.v4()}@mygram.test`
    }
  }
}

module.exports = fixtures
