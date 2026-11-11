'use strict';

/**
 * MODULO: Acceso a datos - Ejercicio
 * Oculta las sentencias sobre el catalogo de ejercicios (RNF-07).
 */

const db = require('../../db/conexion');

/** Lee todo el catalogo en orden de rotacion. */
async function leerTodos() {
  return db.consultar(
    'SELECT id_ejercicio, titulo, instrucciones, orden, duracion_segundos, pasos, repeticiones FROM Ejercicio ORDER BY orden ASC'
  );
}

/** Lee un ejercicio por su posicion en la rotacion. */
async function leerPorOrden(orden) {
  const filas = await db.consultar(
    'SELECT id_ejercicio, titulo, instrucciones, orden, duracion_segundos, pasos, repeticiones FROM Ejercicio WHERE orden = ?',
    [orden]
  );
  return filas[0] || null;
}

/** Lee un ejercicio con el identificador dado. */
async function leerPorId(idEjercicio) {
  const filas = await db.consultar(
    'SELECT id_ejercicio, titulo, instrucciones, orden, duracion_segundos, pasos, repeticiones FROM Ejercicio WHERE id_ejercicio = ?',
    [idEjercicio]
  );
  return filas[0] || null;
}

module.exports = { leerTodos, leerPorOrden, leerPorId };
