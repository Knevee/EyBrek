'use strict';

/**
 * Aplicacion Express de EyBrek.
 * Aqui searma el servidor HTTP: capa de presentacion de la API.
 */

const express = require('express');
const cors = require('cors');
const rutas = require('./rutas');

function crearAplicacion() {
  const app = express();

  // El cliente de escritorio se ejecuta en otro equipo de la red local.
  app.use(cors());

  app.use(express.json({ limit: '100kb' }));

  // Registro simple de peticiones (modulo de comunicacion del servidor).
  app.use((peticion, _respuesta, siguiente) => {
    const marca = new Date().toISOString();
    console.log(`[${marca}] ${peticion.method} ${peticion.originalUrl}`);
    siguiente();
  });

  app.use('/api', rutas);

  // Ruta no encontrada.
  app.use((peticion, respuesta) => {
    respuesta.status(404).json({
      ok: false,
      error: `No existe el recurso ${peticion.method} ${peticion.originalUrl}`,
    });
  });

  // Manejador central de errores.
  // eslint-disable-next-line no-unused-vars
  app.use((error, _peticion, respuesta, _siguiente) => {
    const codigo = Number(error.codigo) || 500;

    if (codigo >= 500) {
      console.error('[error]', error);
    }

    respuesta.status(codigo).json({
      ok: false,
      error:
        codigo >= 500
          ? 'Ocurrio un error inesperado en el servidor.'
          : error.message,
    });
  });

  return app;
}

module.exports = crearAplicacion;
