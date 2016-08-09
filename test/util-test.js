'use strict'

const test = require('ava')

/*
 * primero definimos  el texto del test
 *
 * podemos definir cb y este recibe como param a t (por convencion) que son las aceptions
 * o aserciones y las aserciones son los comandos que voy a correr para garantizar que el
 * resultado que yo tengo de una ejecucion x es el esperado
 */
test('this should pass', t => {
  t.pass()
})

test('this should fail', t => {
  t.fail()
})

/*
 *pasamos una funcion asincrona como callback
 *
 *creamos promesa que simplemente resuelve el valor 42
 *
 *definimos var secret que resuelve promesa
 *
 *hago una asercion y garantizo que el valor de secret es 42
 */
test('it should support async/await', async t => {
  let p = Promise.resolve(42)
  let secret = await p
  t.is(secret, 42)
})
