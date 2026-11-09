'use strict';

/**
 * MODULO: Acceso a datos - Sesion
 * Oculta el formato del token y la tabla donde se guardan las sesiones.
 *
 * En la base de datos no se guarda el token sino su hash SHA-256: si
 * alguien copia la base, no puede usar las sesiones guardadas.
 */

const crypto = require('crypto');
const db = require('../../db/conexion');
const entorno = require('../../config/entorno');
const { ahora } = require('../../db/tiempo');

const DIA_MS = 24 * 60 * 60 * 1000;

/** Genera un token aleatorio e irrepetible. */
function generarToken() {
  return `${crypto.randomUUID()}.${crypto.randomBytes(32).toString('hex')}`;
}

/** Hash del token, que es lo unico que se guarda. */
function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

/** Indica si una sesion ya supero su vigencia. */
function vencida(fechaInicio) {
  const inicio = new Date(String(fechaInicio).replace(' ', 'T'));
  if (Number.isNaN(inicio.getTime())) return true;
  return Date.now() - inicio.getTime() > entorno.sesion.diasVigencia * DIA_MS;
}

/** Crea la sesion de un usuario en un equipo. */
async function crear(idUsuario) {
  const token = generarToken();
  const fechaInicio = ahora();

  const resultado = await db.ejecutar(
    'INSERT INTO Sesion (id_usuario, token, fecha_inicio) VALUES (?, ?, ?)',
    [idUsuario, hashToken(token), fechaInicio]
  );

  return {
    id_sesion: resultado.id,
    id_usuario: idUsuario,
    token,
    fecha_inicio: fechaInicio,
  };
}

/** Busca la sesion activa de un token (null si no existe o ya vencio). */
async function leerPorToken(token) {
  const hash = hashToken(token);
  const filas = await db.consultar(
    `SELECT s.id_sesion, s.id_usuario, s.fecha_inicio,
            u.nombre, u.correo
       FROM Sesion s
       JOIN Usuario u ON u.id_usuario = s.id_usuario
      WHERE s.token = ?`,
    [hash]
  );

  const sesion = filas[0] || null;
  if (!sesion) return null;

  if (vencida(sesion.fecha_inicio)) {
    await db.ejecutar('DELETE FROM Sesion WHERE token = ?', [hash]);
    return null;
  }

  return sesion;
}

/** Cierra una sesion (RF-04). */
async function cerrar(token) {
  const resultado = await db.ejecutar('DELETE FROM Sesion WHERE token = ?', [hashToken(token)]);
  return resultado.cambios > 0;
}

/** Cierra todas las sesiones de un usuario. */
async function cerrarTodas(idUsuario) {
  await db.ejecutar('DELETE FROM Sesion WHERE id_usuario = ?', [idUsuario]);
}

module.exports = { crear, leerPorToken, cerrar, cerrarTodas };
