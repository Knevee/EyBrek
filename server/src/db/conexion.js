'use strict';

/**
 * Acceso a la base de datos.
 *
 * Aqui se elige el motor: SQLite (por defecto) o MySQL. El resto del
 * servidor no sabe cual de los dos esta en uso: por eso el modulo
 * "Acceso a datos" oculta la conexion, tal como esta definido en la
 * seccion 4.6 del documento de diseno.
 *
 * Todo el SQL que se usa en el servidor es portable: las dos motores
 * comparten los mismos marcadores de posicion (?) y las mismas tablas.
 */

const path = require('path');
const entorno = require('../config/entorno');

const MOTORES = {
  sqlite: require('./motores/sqlite'),
  mysql: require('./motores/mysql'),
};

let motor = null;

/** Prepara el motor elegido. Debe llamarse una vez al arrancar. */
async function iniciar() {
  const nombre = entorno.baseDatos.motor;

  if (!MOTORES[nombre]) {
    throw new Error(
      `El motor de base de datos "${nombre}" no existe. Use "sqlite" o "mysql".`
    );
  }

  const configuracion =
    nombre === 'sqlite'
      ? { ruta: path.join(entorno.baseDatos.rutaSQLite) }
      : {
          host: entorno.baseDatos.host,
          puerto: entorno.baseDatos.puerto,
          usuario: entorno.baseDatos.usuario,
          contrasena: entorno.baseDatos.contrasena,
          baseDatos: entorno.baseDatos.nombre,
        };

  motor = new MOTORES[nombre](configuracion);
  await motor.conectar();
  await motor.crearEsquema();

  return motor;
}

/** Devuelve el motor activo. */
function obtener() {
  if (!motor) {
    throw new Error('La base de datos no esta inicializada. Llame antes a iniciar().');
  }
  return motor;
}

/** Ejecuta una consulta y devuelve las filas. */
async function consultar(sql, parametros = []) {
  return obtener().consultar(sql, parametros);
}

/** Ejecuta una consulta que inserta o modifica. */
async function ejecutar(sql, parametros = []) {
  return obtener().ejecutar(sql, parametros);
}

/** Cierra la conexion. */
async function cerrar() {
  if (motor) {
    await motor.cerrar();
    motor = null;
  }
}

module.exports = { iniciar, obtener, consultar, ejecutar, cerrar };
