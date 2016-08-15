'use strict'

const test = require('ava')
const r = require('rethinkdb')
const uuid = require('uuid-base62')
/*
 * Para que require Db funcione, de tal manera que cada vez que hagan require del modulo
 * Db coja el archivo principal (index.js en el package.json), creamos index.js en la raiz
 * y sera un archivo sencillo que solamente  exportara a lib/db "module.exports = require
 * ('./lib/db')"
 */
const Db = require('../')
const fixtures = require('./fixtures')

/*
 * Queremos crear para cada tets una db diferente para poderla crear y luego eliminar,
 * entonces utilizamos un metodo para generar id's, numeros o textos aleatorios y mas
 * adelante usaremos tambien ese numero para el id unico de la imagen, para esto la
 * libreria uuid-base62, base62 porque no utilizaremos caracteres especiales.
 */
// creando name de db aleatorio
const dbName = `mygram_${uuid.v4()}`
// instancia de db
const db = new Db({ db: dbName })

/*
 * Creacion de nuevo metodo que se ejecuta siempre antes de correr un test, entonces ava me
 * permite tener hooks que son metodos que se van a ejecutar antes y despues de ejecutar un
 * test
 */

// Antes de correr un tets condiguramos db
test.before('setup database', async t => {
	// conexion a db con metodo connect que es el que hace el setup
  await db.connect()
	// test que me diga si db esta conectada
  t.true(db.connected, 'should be connected')
})
// Despues de correr los test, desconectarse de la db
test.after('disconnect database', async t => {
  // desconexion a db
  await db.disconnect()
  t.false(db.connected, 'should be disconnected')
})
/*
 * Borrar db, este hook se corre siempre siempre pase lo que pase, si por algun motivo los test
 * no pasan pues after no se ejecuta porque hay una cancelacion de todos test pero con always
 * garantizo que siempre se va a ejecutar
 */
test.after.always('cleanup database', async t => {
  // pequeña logica de conexion con options por defecto de host y port
  let conn = await r.connect({})
  await r.dbDrop(dbName).run(conn)
})

// test asincrono para grabar imagen
test('save image', async t => {
  /*
   * garantizar que clase tenga la funcion grabar imagen.
   *
   * is es una asercion que me permite hacer comparacion entonces "typeof db.saveImage" debe
   * ser igual a 'function'
   */
  t.is(typeof db.saveImage, 'function', 'saveImage is function')

  // Creando imagen aleatoria en cada test
  let image = fixtures.getImage()

  // grabar imagen que le pasamos
  let created = await db.saveImage(image)
  // garantizar que descripcion viene
  t.is(created.description, image.description)
  // propiedad url de la imagen que me devuelve el metodo sea igual a la url que grabamos
  t.is(created.url, image.url)
  // comparacion de likes
  t.is(created.likes, image.likes)
  // comparacion de liked
  t.is(created.liked, image.liked)
  // verificar que objeto created tenga los tags
  t.deepEqual(created.tags, ['awesome', 'tags', 'relax'])
  // comparacion de user_id
  t.is(created.user_id, image.user_id)
  // Estas dos aserciones siguientes deben ser creadas en la implementacion
  // garantizar que la imagen viene con id (autogenerado por db) de tipo string
  t.is(typeof created.id, 'string')
  // propiedad es igual a la codificacion en base 62 del id oficial de la imagen
  t.is(created.public_id, uuid.encode(created.id))
  // garantizar que la imagen viene con la fecha de creacion
  t.truthy(created.createdAt)
})

// test async para likes de imagenes
test('like image', async t => {
  // garantizar que la clase Db tenga un metodo likeImage
  t.is(typeof db.likeImage, 'function', 'likeImage is a function')
  // obtener imagen de los fixtures
  let image = fixtures.getImage()
  // almacenar imagen en la db
  let created = await db.saveImage(image)
  // ver el resultado de likeImage que le pasamos siempre el id publico de la img
  let result = await db.likeImage(created.public_id)

  // garantizo que la propiedad liked de la image sea verdadera
  t.true(result.liked)
  // garantizo que likes de la imagen son iguales a los likes de la info
  t.is(result.likes, image.likes + 1)
})
