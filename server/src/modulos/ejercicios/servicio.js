'use strict';

/**
 * MODULO: Ejercicios (servidor)
 * Responsabilidad: entregar el siguiente ejercicio de la rotacion.
 * Oculta: como se calcula la rotacion y como se guarda el progreso.
 * Operacion: siguienteEjercicio.
 */

const ejercicios = require('../acceso-a-datos/ejercicios');
const progreso = require('../acceso-a-datos/progreso');

/** Devuelve el catalogo completo sin tocar el progreso del usuario. */
async function catalogo() {
  const lista = await ejercicios.leerTodos();
  return lista.map((ejercicio, indice) => ({
    id_ejercicio: ejercicio.id_ejercicio,
    titulo: ejercicio.titulo,
    instrucciones: ejercicio.instrucciones,
    orden: ejercicio.orden,
    duracion_segundos: ejercicio.duracion_segundos,
    posicion: indice + 1,
    total: lista.length,
  }));
}

/**
 * Entrega el siguiente ejercicio de la rotacion y registra cual fue (RF-20, RF-21).
 * Cuando el ultimo ejercicio fue el final de la lista, vuelve al primero.
 */
async function siguienteEjercicio(idUsuario) {
  const lista = await ejercicios.leerTodos();

  if (lista.length === 0) {
    const error = new Error('No hay ejercicios disponibles en el catalogo.');
    error.codigo = 503;
    throw error;
  }

  const avance = await progreso.leerPorUsuario(idUsuario);
  let indice = 0;

  if (avance && avance.id_ultimo_ejercicio) {
    const posicion = lista.findIndex(
      (ejercicio) => ejercicio.id_ejercicio === avance.id_ultimo_ejercicio
    );
    indice = posicion >= 0 ? (posicion + 1) % lista.length : 0;
  }

  const elegido = lista[indice];
  await progreso.guardarUltimo(idUsuario, elegido.id_ejercicio);

  return {
    id_ejercicio: elegido.id_ejercicio,
    titulo: elegido.titulo,
    instrucciones: elegido.instrucciones,
    orden: elegido.orden,
    duracion_segundos: elegido.duracion_segundos,
    posicion: indice + 1,
    total: lista.length,
  };
}

module.exports = { siguienteEjercicio, catalogo };
