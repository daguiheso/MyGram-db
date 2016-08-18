'use strict'

const co = require('co')
const r = require('rethinkdb')
// Sobreescribimos Promise nativo de js pata utilizar la que viene con bluebird
const Promise = require('bluebird')
const utils = require('./utils')
const uuid = require('uuid-base62')

// Config DB por defecto
const defaults = {
  host: 'localhost',
  port: 28015,
  db: 'mygram'
}

// Creamos la clase base para acceder a la DB
class Db {

  /*
   * Constructor de la clase
   * La idea es que pueda hacer overwrite o remplazar los valores por default a la hora
   * de instanciar la clase, entonces la mejor opcion es utilizando el constructor de la
   * clase, que recibira como primer argumento unas opciones y de esta manera cada vez que
   * se instancie la clase se podrá cambiar los valores.
   */
  constructor (options) {
    options = options || {}
    this.host = options.host || defaults.host
    this.port = options.port || defaults.port
    this.db = options.db || defaults.db
  }

  /*
   * creamos funcion connect() dentro de clase y esta funcion va crear una nueva conneccion
   * dentro de la clase Db y llamamos al metodo connect() de rethinkDB que puede ser llamado
   * con varios parametros, como host y puerto, si no le paso params utilizara la info por
   * defecto. Cuando ya tenemos el objeto de conexion, este objeto retorna una promesa si no
   * le paso un callback pro parametro.
   */
  connect (cb) {
    this.connection = r.connect({
      host: this.host, // obtenido de la instancia de la clase
      port: this.port // obtenido de la instancia de la clase
    })

    // creacion de propiedad connected
    this.connected = true

    /*
     * Para conectarme a la db debo referenciar la conexion, entonces ya que no tengo acceso
     * al this dentro de la function generator porque me va es a coger el this de la misma
     * function y no el del contexto de la clase Db, creo conexion como una varoable que pueda
     * usar dentro del contexto y tambien el nombre de la db
     */
    let db = this.db
    let connection = this.connection

    /*
     * Esta clase Db la vamos a testear en el futuro y no quiero hacer pruebas sobre la db
     * de produccion, entonces de esa manera queremos definir un nombre de base de datos
     * aleatorio cuando este haciendo pruebas, correr las pruebas sobre una db real y
     * despues al terminar las pruebas eliminar esa db temporal. Asi que requerimos un paso
     * de configuracion o de setup de nuestra db para que el pueda crear esa db si no existe,
     * o crear las tablas si no existen, entonces definimos ese metodo de setup, primeramente
     * referencuamos CO y luego creamos las funciones que van a correr en una CO(corutina)
     *
     *
     * Setup va a ser un funtion generator corriendo sobre co, que me va a retornar una promesa.
     *
     * Para hacer una serie de function generator que corran com async/await y me retornen una
     * promesa, utilizamos una function wrap dentro de co y pasar una function generator.
     *
     * Como reconocer una function generator?, tiene un * despues de la palabra clave function.
     *
     * Setup me entrega una promise, cuando resolvamos esta promesa, va a resolver todas las
     * tareas que tenga dentro de la function generator
     */
    let setup = co.wrap(function * () {
      /*
       * Finalmente vamos conectamos a la db, entonces cogemos la referencia de la db, asi que
       * resolvemos la promesa utilizando la plalabra reservada yield y pasandole como argumento
       * la promesa.
       *
       * co.wrap(function * () es lo mismo que llamar a async y yield es lo mismo a await
       */
      let conn = yield connection
      /*
       * Luego quiero obtener la lista de db y crear la db si no existe, asi que llamamos el
       * metodo dbList de rethinkDB y corremos el comando y le pasamos la referencia de la
       * conexion, este run(conn) es como darle click a run en el dataexplorer de rethinkDB y
       * es necesario ponerlo siempre que escribamos un comando de rethinkDB en nodejs.
       *
       * El yield es porque estamos llamando dbList com una promesa, entonces toda la expresion:
       * r.dbList.run(conn) me va a devolver una promesa y yield me esta resolviendo la promesa,
       * asi que la variable dbList me esta retornando el arreglo o resultado final de la base
       * de datos, esto es mas facil de escribir ya que escribo codigo de manera secuancial.
       */
      let dbList = yield r.dbList().run(conn)
      /*
       * Verificamos si la db tiene a la db que estoy ingresando o no
       *
       * Con indexOf verifico si el name de la db que le pase a la configuracion esta dentro
       * del array dbList y si no esta me retorna -1
       */
      if (dbList.indexOf(db) === -1) {
        /*
         * Como r.dbCreate(db).run(conn) es una promesa le anteponemos yield, de esta manera
         * yield va esperar a que r.dbCreate(db).run(conn) se ejecute y va a continuar con la
         * ejecucion.
         */
        yield r.dbCreate(db).run(conn)
      }

      // Obtener las tablas de la db
      let dbTables = yield r.db(db).tableList().run(conn)
      // if dbTables no tiene images como tabla creamos la tabla de images
      if (dbTables.indexOf('images') === -1) {
        yield r.db(db).tableCreate('images').run(conn)
        // crear indice en la tablas images de la db
        yield r.db(db).table('images').indexCreate('createdAt').run(conn)
      }
      // if dbTables no tiene users como tabla creamos la tabla de users
      if (dbTables.indexOf('users') === -1) {
        yield r.db(db).tableCreate('users').run(conn)
      }

      /*
       * De esta manera tenemos el metodo basico para hacer setup de la db, ya por ultimo como
       * estamos ejecutando el metodo setup, devolvemos una referencia de la conexion a la db.
       *
       * La promesa que devuelve co.wrap y se la asigna a setup, devuelve la conexion (conn) y
       * va a hacer todas las operaciones del function generator.
       */
      return conn
    })

    /*
     * Como setup es una promesa vamos a resolverla
     *
     * Para esta clase Db utilizamos lo mismo que hace rethinkDB, que es un mecanismo muy bueno,
     * y es que yo puedo tener funciones que si yo le paso un callback me ejecuta en el callback
     * o si no se lo pasamos me devuelva una promesa. Para implementar esta logica vamos a
     * utilizar la mejor implementacion de promesas para Julian Duque en el mercado que es
     * BLUEBIRD.
     *
     * Bluebird a parte de ser una implementacion del estandar promise de javascript, me permite
     * tenr ciertos metdos extra para trabajar con otros feaxtures, por ejemplo implementar una
     * function que sea hibrida (si devuelve una promesa cuando no tiene cb o si tiene cb devolverla
     * como tal).
     *
     * Retornamos la promesa resulta de setup(), cuando yo ejecuto la funcion me retorna la
     * conexion y toda es a promesa "Promise.resolve(setup())" la  manejamos tambien como si
     * fuera un callback.
     *
     * Asi que con esta linea estamos diciendo que si no me pasan callback ".as Callback(cb)"
     * retornar la promesa "return Promise.resolve(setup())"
     *
     * Esto es una ventaga de bluebird, que me permite definir metodos hibridos que reciban cb
     * para funcionar con el esquema normal de node o metodos completamente asincronos utilizando
     * promesas
     */
    return Promise.resolve(setup()).asCallback(cb)
  }

  // Desconexion de la Db
  disconnect (cb) {
    // lanzar error si no estamos conectados a la db
    if (!this.connected) {
      // hacer un reject de una promesa con el error "not connected" y lo hacemos hibrido
      return Promise.reject(new Error('not connected')).asCallback(cb)
    }

    // propidad desconnectada
    this.connected = false
    /*
     * Resolviendo conexion y despues cerrar la misma, como son solo dos operaciones no
     * utilizamos co y usamos chain(encadenamiento)
     */
    return Promise.resolve(this.connection).then((conn) => conn.close())
  }

  saveImage (image, cb) {
    // lanzar error si no estamos conectados a la db
    if (!this.connected) {
      // hacer un reject de una promesa con el error "not connected" y lo hacemos hibrido
      return Promise.reject(new Error('not connected')).asCallback(cb)
    }

    // referencia a conexion ya que utilizaremos una coorutina
    let connection = this.connection
    // referencia a db
    let db = this.db
    // creacion de coorutina de tareas que recibe una function contructora
    let tasks = co.wrap(function * () {
      // conexion a db resolviendo la promesa
      let conn = yield connection
      // definimos una fecha de creacion a objeto imagen
      image.createdAt = new Date()
      // creando propiedad de tags
      image.tags = utils.extractTags(image.description)

      // almacenar en db
      let result = yield r.db(db).table('images').insert(image).run(conn)

      // consultamos resultado de operacion
      if (result.errors > 0) {
        // si es mayor a 0 hacemos reject de la promesa que me muestre el primer error de rethinkDB
        return Promise.reject(new Error(result.first_error))
      }

      image.id = result.generated_keys[0]
      /*
       * como solo sabemos el id de la imagen despues de almacenarla entonces
       * actualizamos objeto image con nuevo public_id despues de saber id
       *
       * actualizando campo con rethinkDB con la nueva property, obtener tablas -> obtener
       * elemento por id -> llamamos metodo update() con param de config
       */
      yield r.db(db).table('images').get(image.id).update({
        public_id: uuid.encode(image.id)
      }).run(conn)

      /*
       * No resolvemos el mismo objeto de image que hemos estado armando si no que obtenemos
       * ya el que quedo en la db, con eso garantizamos que si recibimos la info de la db y
       * de esta manera retornamos el que esta created en "return Promise.resolve(created)"
       */
      let created = yield r.db(db).table('images').get(image.id).run(conn)

      return Promise.resolve(created)
    })

    // resolviendo coorutina
    return Promise.resolve(tasks()).asCallback(cb)
  }

  likeImage (id, cb) {
    // lanzar error si no estamos conectados a la db
    if (!this.connected) {
      // hacer un reject de una promesa con el error "not connected" y lo hacemos hibrido
      return Promise.reject(new Error('not connected')).asCallback(cb)
    }

    // referencia a conexion ya que utilizaremos una coorutina
    let connection = this.connection
    // referencia a db
    let db = this.db
    /*
     * obtenemos id original apartir de id publico, por eso utilizamos decode() ya que el
     * id publico es una operacion base62 del id privado, entonces lo decodificamos para
     * obtener el id original
     */
    let imageId = uuid.decode(id)

    // creacion de coorutina de tareas que recibe una function contructora
    let tasks = co.wrap(function * () {
      // conexion a db resolviendo la promesa
      let conn = yield connection

      // consulta a db para obtener imagen
      let image = yield r.db(db).table('images').get(imageId).run(conn)
      // update by imageId el campo liked y likes
      yield r.db(db).table('images').get(imageId).update({
        liked: true,
        likes: image.likes + 1
      }).run(conn)

      // obtener la imagen final
      let created = yield r.db(db).table('images').get(imageId).run(conn)
      // resolver promesa
      return Promise.resolve(created)
    })

    // resolviendo coorutina
    return Promise.resolve(tasks()).asCallback(cb)
  }

  getImage (id, cb) {
    if (!this.connected) {
      return Promise.reject(new Error('not connected')).asCallback(cb)
    }

    let connection = this.connection
    let db = this.db

    let imageId = uuid.decode(id)

    let tasks = co.wrap(function * () {
      let conn = yield connection
      // consulta a db para obtener imagen
      let image = yield r.db(db).table('images').get(imageId).run(conn)
      return Promise.resolve(image)
    })

    // resolviendo coorutina
    return Promise.resolve(tasks()).asCallback(cb)
  }

  getImages (cb) {
    if (!this.connected) {
      return Promise.reject(new Error('not connected')).asCallback(cb)
    }

    let connection = this.connection
    let db = this.db

    let tasks = co.wrap(function * () {
      let conn = yield connection

      // consulta a db para obtener imagenes, ordenandolas por el indice dado
      let images = yield r.db(db).table('images').orderBy({
        index: r.desc('createdAt')
      }).run(conn)
      /*
       * El resultado anterior me devuelve un cursor, un cursor es un objeto el cual yo
       * puedo navegar bien sea eventEmmiter o metodo next() para que me entregue el
       * siguiente resultado.
       * Este cursor tiene un metodo toArray que me convierte todo el resultado en un array
       */
      let result = yield images.toArray()

      return Promise.resolve(result)
    })

    // resolviendo coorutina
    return Promise.resolve(tasks()).asCallback(cb)
  }

  saveUser (user, cb) {
    if (!this.connected) {
      return Promise.reject(new Error('not connected')).asCallback(cb)
    }

    let connection = this.connection
    let db = this.db

    let tasks = co.wrap(function * () {
      let conn = yield connection
      // actualizar objeto
      user.password = utils.encrypt(user.password)
      // asignar fecha
      user.createdAt = new Date()

      // insert user in db
      let result = yield r.db(db).table('users').insert(user).run(conn)

      if (result.errors > 0) {
        // retornando promesa reject(erronea)
        return Promise.reject(new Error(result.first_error))
      }

      user.id = result.generated_keys[0]

      // consulta usuario creado
      let created = yield r.db(db).table('users').get(user.id).run(conn)

      return Promise.resolve(created)
    })

    // resolviendo coorutina
    return Promise.resolve(tasks()).asCallback(cb)
  }
}

module.exports = Db
