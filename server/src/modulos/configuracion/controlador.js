'use strict';

/**
 * MODULO: Configuracion (servidor) - Controlador
 */

const servicio = require('./servicio');
const manejador = require('../../middlewares/manejador');

/** GET /api/configuracion */
const obtener = manejador(async (peticion, respuesta) => {
  const configuracion = await servicio.obtener(peticion.idUsuario);

  respuesta.json({
    ok: true,
    datos: { configuracion },
  });
});

/** PUT /api/configuracion */
const guardar = manejador(async (peticion, respuesta) => {
  const configuracion = await servicio.guardar(peticion.idUsuario, peticion.body || {});

  respuesta.json({
    ok: true,
    mensaje: 'Configuracion guardada.',
    datos: { configuracion },
  });
});

module.exports = { obtener, guardar };
