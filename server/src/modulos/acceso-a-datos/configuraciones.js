'use strict';

/**
 * MODULO: Acceso a datos - Configuracion
 * Oculta las sentencias sobre la tabla Configuracion.
 */

const db = require('../../db/conexion');

const CAMPOS =
  'id_configuracion, id_usuario, bloqueo_activo, intervalo_minutos, ' +
  'duracion_minutos, hora_inicio, hora_fin, notificaciones_activas';

/** Lee la configuracion de un usuario (null si no existe). */
async function leerPorUsuario(idUsuario) {
  const filas = await db.consultar(
    `SELECT ${CAMPOS} FROM Configuracion WHERE id_usuario = ?`,
    [idUsuario]
  );
  return filas[0] || null;
}

/**
 * Crea la configuracion por defecto de un usuario nuevo (RF-12):
 * bloqueo activado, cada 2 horas, duracion de 15 minutos,
 * horario de 8:00 a. m. a 9:00 p. m. y notificaciones activadas.
 */
async function crearPorDefecto(idUsuario) {
  const existente = await leerPorUsuario(idUsuario);

  if (!existente) {
    await db.ejecutar(
      `INSERT INTO Configuracion
         (id_usuario, bloqueo_activo, intervalo_minutos, duracion_minutos,
          hora_inicio, hora_fin, notificaciones_activas)
       VALUES (?, 1, 120, 15, '08:00:00', '21:00:00', 1)`,
      [idUsuario]
    );
  }

  return leerPorUsuario(idUsuario);
}

/** Guarda la configuracion validada de un usuario. */
async function guardar(idUsuario, configuracion) {
  // Se comprueba la existencia antes de actualizar: en MySQL el numero de
  // filas afectadas es 0 cuando los valores no cambian, y eso no debe
  // confundirse con "la configuracion no existe".
  const existente = await leerPorUsuario(idUsuario);
  if (!existente) {
    await crearPorDefecto(idUsuario);
  }

  await db.ejecutar(
    `UPDATE Configuracion
        SET bloqueo_activo = ?,
            intervalo_minutos = ?,
            duracion_minutos = ?,
            hora_inicio = ?,
            hora_fin = ?,
            notificaciones_activas = ?
      WHERE id_usuario = ?`,
    [
      configuracion.bloqueo_activo ? 1 : 0,
      configuracion.intervalo_minutos,
      configuracion.duracion_minutos,
      configuracion.hora_inicio,
      configuracion.hora_fin,
      configuracion.notificaciones_activas ? 1 : 0,
      idUsuario,
    ]
  );

  return leerPorUsuario(idUsuario);
}

module.exports = { leerPorUsuario, crearPorDefecto, guardar };
