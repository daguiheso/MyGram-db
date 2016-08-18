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
const utils = require('../lib/utils')
const fixtures = require('./fixtures')

/*
 * Creacion de nuevo metodo que se ejecuta siempre antes de correr un test, entonces ava me
 * permite tener hooks que son metodos que se van a ejecutar antes y despues de ejecutar un
 * test
 */

// Antes de correr cada uno de los tets condiguramos db
test.beforeEach('setup database', async t => {
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
	// conexion a db con metodo connect que es el que hace el setup
  await db.connect()
  t.context.db = db
  t.context.dbName = dbName
	// test que me diga si db esta conectada
  t.true(db.connected, 'should be connected')
})

/*
 * Despues de correr c/u de los test: obtener contexto,desconectarse de la db, borrar db
 *
 * Este hook se corre siempre siempre pase lo que pase, si por algun motivo los test no
 * pasan pues after no se ejecuta porque hay una cancelacion de todos test pero con always
 * garantizo que siempre se va a ejecutar
 */
test.afterEach.always('cleanup database', async t => {
  // obteniendo el contexto
  let db = t.context.db
  let dbName = t.context.dbName

  // desconexion a db
  await db.disconnect()
  t.false(db.connected, 'should be disconnected')

  // cleanup database - pequeña logica de conexion con options por defecto de host y port
  let conn = await r.connect({})
  await r.dbDrop(dbName).run(conn)
})

// test asincrono para grabar imagen
test('save image', async t => {
  // obteniendo el contexto
  let db = t.context.db

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
  // obteniendo el contexto
  let db = t.context.db

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

// test obtener imagen
test('get image', async t => {
  // obteniendo el contexto
  let db = t.context.db

  t.is(typeof db.getImage, 'function', 'getImage is a function')
  let image = fixtures.getImage()
  let created = await db.saveImage(image)
  let result = await db.getImage(created.public_id)

  // garantizar que imagen creada es igual a la obtenida de getImage de la db
  t.deepEqual(created, result)
})

// test listar imagenes de la db
test('list all images', async t => {
  // obteniendo el contexto
  let db = t.context.db

  // obtenemos las imagenes
  let images = fixtures.getImages(3)
  /*
   * Necesitamos almacenar todas las imagenes en la db asi que usaremos una tecnica
   * sabemos que saveImage retorna una promesa, entonces creamos un array de
   * promesas y luego todas esas promesas las resolvemos con Promise.all, es una
   * forma en que tenemos un array de promesas y las resolvemos hasta que todas las
   * promsesas terminen y me devuelve un resultado
   */
  let saveImages = images.map(img => db.saveImage(img))
  // array con todas las imagenes creadas
  let created = await Promise.all(saveImages)
  // probar metodo
  let result = await db.getImages()
  // probar que tamaño de imagenes creadas sea igual al tamaño de images consultadas
  // no hacemos deepEqual porque algortimo se sorting en rethink puede ser !=
  t.is(created.length, result.length)
  // t.is(typeof db.getImages, 'function', 'getImages is a function')
})

// test saveUser
test('save user', async t => {
  let db = t.context.db

  t.is(typeof db.saveUser, 'function', 'saveUser is a function')

  let user = fixtures.getUser()
  let plainPassword = user.password
  let created = await db.saveUser(user)

  t.is(user.username, created.username)
  t.is(user.email, created.email)
  t.is(user.name, created.name)
  t.is(utils.encrypt(plainPassword), created.password)
  t.is(typeof created.id, 'string')
  // truthy verifica que halla un valor
  t.truthy(created.createdAt)
})
