'use strict';

/**
 * Configuracion del servidor.
 * Oculta de donde salen los valores de conexion y los puertos.
 */

require('dotenv').config();

const path = require('path');

const entorno = {
  puerto: Number(process.env.PUERTO || 3000),

  baseDatos: {
    // Motor de base de datos: 'sqlite' (por defecto) o 'mysql'.
    motor: (process.env.DB_MOTOR || 'sqlite').toLowerCase(),

    // SQLite: archivo de la base de datos. Se crea solo, sin contrasena.
    rutaSQLite: process.env.DB_RUTA || path.join(__dirname, '..', '..', 'datos', 'eybrek.db'),

    // MySQL: se usa el usuario de aplicacion, nunca root.
    host: process.env.DB_HOST || 'localhost',
    puerto: Number(process.env.DB_PORT || 3306),
    usuario: process.env.DB_USER || 'eybrek',
    contrasena: process.env.DB_PASSWORD || '',
    nombre: process.env.DB_NAME || 'eybrek',
  },

  hashing: {
    rondas: Number(process.env.BCRYPT_ROUNDS || 10),
  },

  sesion: {
    // Dias que dura una sesion antes de pedir la contrasena otra vez.
    diasVigencia: Number(process.env.SESION_DIAS || 90),
  },

  intentos: {
    // Intentos fallidos de inicio de sesion permitidos por equipo y correo.
    maximo: Number(process.env.INTENTOS_MAXIMOS || 10),
    ventanaMinutos: Number(process.env.INTENTOS_VENTANA_MIN || 15),
  },
};

module.exports = entorno;
