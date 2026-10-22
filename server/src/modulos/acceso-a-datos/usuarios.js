'use strict';

/**
 * MODULO: Acceso a datos - Usuario
 * Oculta las sentencias SQL y la forma en que se cifran las contrasenas.
 */

const bcrypt = require('bcryptjs');
const db = require('../../db/conexion');
const entorno = require('../../config/entorno');

const CAMPOS = 'id_usuario, nombre, correo, contrasena_hash, fecha_creacion';

/** Lee un usuario por su correo electronico. */
async function leerPorCorreo(correo) {
  const filas = await db.consultar(
    `SELECT ${CAMPOS} FROM Usuario WHERE correo = ?`,
    [correo]
  );
  return filas[0] || null;
}

/** Lee un usuario por su identificador. */
async function leerPorId(idUsuario) {
  const filas = await db.consultar(
    `SELECT ${CAMPOS} FROM Usuario WHERE id_usuario = ?`,
    [idUsuario]
  );
  return filas[0] || null;
}

/**
 * Crea un usuario. La contrasena se guarda cifrada con hash,
 * nunca en texto plano (RNF-02).
 */
async function crear({ nombre, correo, contrasena }) {
  const hash = await bcrypt.hash(contrasena, entorno.hashing.rondas);
  const resultado = await db.ejecutar(
    'INSERT INTO Usuario (nombre, correo, contrasena_hash) VALUES (?, ?, ?)',
    [nombre, correo, hash]
  );
  return leerPorId(resultado.id);
}

/** Compara una contrasena en texto plano con el hash guardado. */
async function verificarContrasena(contrasena, hash) {
  return bcrypt.compare(contrasena, hash);
}

/** Elimina un usuario (se usa en las pruebas). */
async function eliminar(idUsuario) {
  await db.ejecutar('DELETE FROM Usuario WHERE id_usuario = ?', [idUsuario]);
}

module.exports = {
  leerPorCorreo,
  leerPorId,
  crear,
  verificarContrasena,
  eliminar,
};
