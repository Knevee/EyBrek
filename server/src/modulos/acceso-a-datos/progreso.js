'use strict';

/**
 * MODULO: Acceso a datos - ProgresoRotacion
 * Oculta como se guarda el avance de la rotacion de cada usuario (RF-21).
 */

const db = require('../../db/conexion');

/** Lee el progreso de rotacion de un usuario. */
async function leerPorUsuario(idUsuario) {
  const filas = await db.consultar(
    'SELECT id_progreso, id_usuario, id_ultimo_ejercicio FROM ProgresoRotacion WHERE id_usuario = ?',
    [idUsuario]
  );
  return filas[0] || null;
}

/** Crea el registro de progreso de un usuario nuevo. */
async function crear(idUsuario) {
  const existente = await leerPorUsuario(idUsuario);

  if (!existente) {
    await db.ejecutar(
      'INSERT INTO ProgresoRotacion (id_usuario, id_ultimo_ejercicio) VALUES (?, NULL)',
      [idUsuario]
    );
  }

  return leerPorUsuario(idUsuario);
}

/**
 * Guarda el ultimo ejercicio que se mostro. Si el usuario todavia no
 * tiene registro de progreso, se crea: asi Autenticacion no necesita
 * conocer la rotacion de ejercicios.
 */
async function guardarUltimo(idUsuario, idEjercicio) {
  await crear(idUsuario);
  await db.ejecutar(
    'UPDATE ProgresoRotacion SET id_ultimo_ejercicio = ? WHERE id_usuario = ?',
    [idEjercicio, idUsuario]
  );
  return leerPorUsuario(idUsuario);
}

module.exports = { leerPorUsuario, crear, guardarUltimo };
