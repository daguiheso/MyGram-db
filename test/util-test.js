'use strict'

const test = require('ava')

/*
 * Syntax Test
 *
 * primero definimos  el texto del test
 *
 * podemos definir cb y este recibe como param a t (por convencion) que son las aceptions
 * o aserciones y las aserciones son los comandos que voy a correr para garantizar que el
 * resultado que yo tengo de una ejecucion x es el esperado
 */

/*
 * caso: al subir imagenes a plataforma , permitir tener descripcion de la
 * imagen, para esta descripcion se puede utilizar hashtag para definir terminos, a
 * partir de esos terminos o descripcion quiero extraer y/o obtenr un arreglo con los
 * terminos. Escribimos prueba para esta funcionalidad antes de implementarla
 */

const utils = require('../lib/utils')

test('extracting hashtags from text', t => {
  /*
   * tengo unos tags y llamo la funcionalidad extractTags y le pasamos un texto y quiero
   * que me me los devuelva en minuscula siempre, sin el # y omita si escriben dos veces
   * ##, esto para filtrar en la db las imagenes
   */
  let tags = utils.extractTags('a #picture with tags #AwEsOmE #Platzi #AVA and #100 ##yes')

  /*
   * espero que el arreglo tags sea igual al siguiente, para una asercion de comparacion
   * utilizamos la funcion deepEqual(), la cual tiene en cuenta posicion, contenido, todo.
   */
  t.deepEqual(tags, [
    'picture',
    'awesome',
    'platzi',
    'ava',
    '100',
    'yes'
  ])

  // que pasa si el texto no tiene tags, pues espero que me devuelva un array vacio
  tags = utils.extractTags('a picture with no tags')
  t.deepEqual(tags, [])

  // que pasa si no le paso ningun argumento a la funcion
  tags = utils.extractTags()
  t.deepEqual(tags, [])

  // que pasa si llaman la funcion con un null
  tags = utils.extractTags(null)
  t.deepEqual(tags, [])
})
