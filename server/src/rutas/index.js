'use strict';

/**
 * Rutas de la API REST de EyBrek.
 * Cada ruta corresponde a una operacion de los modulos del servidor
 * descritas en la seccion 4.6 del documento de diseno.
 */

const express = require('express');

const autenticacion = require('../modulos/autenticacion/controlador');
const configuracion = require('../modulos/configuracion/controlador');
const ejercicios = require('../modulos/ejercicios/controlador');
const requiereSesion = require('../middlewares/requiereSesion');
const limitarIntentos = require('../middlewares/limitarIntentos');

const rutas = express.Router();

// ---- Salud del servidor (sin sesion) -------------------------------
rutas.get('/salud', (_peticion, respuesta) => {
  respuesta.json({
    ok: true,
    mensaje: 'EyBrek esta en linea.',
    datos: { servidor: 'eybrek-server', hora: new Date().toISOString() },
  });
});

// ---- Autenticacion --------------------------------------------------
rutas.post('/auth/registro', autenticacion.registrar);
rutas.post('/auth/iniciar-sesion', limitarIntentos, autenticacion.iniciarSesion);
rutas.post('/auth/cerrar-sesion', autenticacion.cerrarSesion);
rutas.get('/auth/sesion', requiereSesion, autenticacion.sesionActual);

// ---- Configuracion --------------------------------------------------
rutas.get('/configuracion', requiereSesion, configuracion.obtener);
rutas.put('/configuracion', requiereSesion, configuracion.guardar);

// ---- Ejercicios -----------------------------------------------------
rutas.get('/ejercicios', requiereSesion, ejercicios.catalogo);
rutas.get('/ejercicios/siguiente', requiereSesion, ejercicios.siguiente);

module.exports = rutas;
