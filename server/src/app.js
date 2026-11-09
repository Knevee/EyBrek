'use strict';

/**
 * Aplicacion Express de EyBrek.
 * Aqui searma el servidor HTTP: capa de presentacion de la API.
 */

const express = require('express');
const rutas = require('./rutas');

function crearAplicacion() {
  const app = express();

  // No se habilita CORS: el cliente de escritorio hace las peticiones
  // desde el proceso principal de Electron, donde CORS no aplica, y asi
  // ninguna pagina web abierta en la red puede usar la API.
  app.disable('x-powered-by');

  app.use(express.json({ limit: '100kb' }));

  // Registro simple de peticiones (modulo de comunicacion del servidor).
  // Se escribe solo la ruta, sin la cadena de consulta.
  app.use((peticion, _respuesta, siguiente) => {
    const marca = new Date().toISOString();
    console.log(`[${marca}] ${peticion.method} ${peticion.baseUrl}${peticion.path}`);
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
