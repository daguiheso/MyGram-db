'use strict'

const co = require('co')
const r = require('rethinkdb')
// Sobreescribimos Promise nativo de js pata utilizar la que viene con bluebird
const Promise = require('bluebird')

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
      port: this.port, // obtenido de la instancia de la clase
    })

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
}

module.exports = Db