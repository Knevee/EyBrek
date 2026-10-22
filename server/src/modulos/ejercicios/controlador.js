'use strict';

/**
 * MODULO: Ejercicios (servidor) - Controlador
 */

const servicio = require('./servicio');
const manejador = require('../../middlewares/manejador');

/** GET /api/ejercicios */
const catalogo = manejador(async (_peticion, respuesta) => {
  const ejercicios = await servicio.catalogo();

  respuesta.json({
    ok: true,
    datos: { ejercicios },
  });
});

/** GET /api/ejercicios/siguiente */
const siguiente = manejador(async (peticion, respuesta) => {
  const ejercicio = await servicio.siguienteEjercicio(peticion.idUsuario);

  respuesta.json({
    ok: true,
    datos: { ejercicio },
  });
});

module.exports = { catalogo, siguiente };
