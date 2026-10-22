'use strict';

/**
 * MODULO: Autenticacion (servidor) - Controlador
 * Traduce las peticiones HTTP en llamadas al servicio de autenticacion.
 */

const servicio = require('./servicio');
const manejador = require('../../middlewares/manejador');

/** POST /api/auth/registro */
const registrar = manejador(async (peticion, respuesta) => {
  const { nombre, correo, contrasena } = peticion.body || {};

  const usuario = await servicio.registrar({ nombre, correo, contrasena });

  respuesta.status(201).json({
    ok: true,
    mensaje: 'Cuenta creada. Ya puedes iniciar sesion.',
    datos: { usuario },
  });
});

/** POST /api/auth/iniciar-sesion */
const iniciarSesion = manejador(async (peticion, respuesta) => {
  const { correo, contrasena } = peticion.body || {};

  const resultado = await servicio.iniciarSesion({ correo, contrasena });

  respuesta.json({
    ok: true,
    mensaje: 'Sesion iniciada.',
    datos: resultado,
  });
});

/** POST /api/auth/cerrar-sesion */
const cerrarSesion = manejador(async (peticion, respuesta) => {
  const token = (peticion.headers.authorization || '').replace('Bearer ', '').trim();

  await servicio.cerrarSesion(token);

  respuesta.json({
    ok: true,
    mensaje: 'Sesion cerrada.',
    datos: {},
  });
});

/** GET /api/auth/sesion */
const sesionActual = manejador(async (peticion, respuesta) => {
  respuesta.json({
    ok: true,
    datos: {
      usuario: {
        id_usuario: peticion.idUsuario,
        nombre: peticion.sesion.nombre,
        correo: peticion.sesion.correo,
      },
    },
  });
});

module.exports = { registrar, iniciarSesion, cerrarSesion, sesionActual };
