'use strict';

/**
 * MODULO: Autenticacion (servidor)
 * Responsabilidad: registrar usuarios, iniciar sesion y cerrar sesion.
 * Oculta: como se cifran las contrasenas y como se generan los tokens.
 * Operaciones: registrar, iniciarSesion, cerrarSesion, validarToken.
 */

const usuarios = require('../acceso-a-datos/usuarios');
const sesiones = require('../acceso-a-datos/sesiones');
const configuraciones = require('../acceso-a-datos/configuraciones');
const progreso = require('../acceso-a-datos/progreso');

const ErrorValidacion = require('../../errores/ErrorValidacion');
const ErrorNoAutorizado = require('../../errores/ErrorNoAutorizado');

const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const LONGITUD_MINIMA_NOMBRE = 3;
const LONGITUD_MINIMA_CONTRASENA = 6;

/** Registra un usuario nuevo con su configuracion por defecto (RF-01, RF-12). */
async function registrar({ nombre, correo, contrasena }) {
  const nombreLimpio = String(nombre || '').trim();
  const correoLimpio = String(correo || '').trim().toLowerCase();

  if (nombreLimpio.length < LONGITUD_MINIMA_NOMBRE) {
    throw new ErrorValidacion(
      `El nombre debe tener al menos ${LONGITUD_MINIMA_NOMBRE} caracteres.`
    );
  }

  if (!FORMATO_CORREO.test(correoLimpio)) {
    throw new ErrorValidacion('El correo electronico no tiene un formato valido.');
  }

  if (String(contrasena || '').length < LONGITUD_MINIMA_CONTRASENA) {
    throw new ErrorValidacion(
      `La contrasena debe tener al menos ${LONGITUD_MINIMA_CONTRASENA} caracteres.`
    );
  }

  const existente = await usuarios.leerPorCorreo(correoLimpio);
  if (existente) {
    throw new ErrorValidacion('Ese correo electronico ya esta registrado.');
  }

  const usuario = await usuarios.crear({
    nombre: nombreLimpio,
    correo: correoLimpio,
    contrasena,
  });

  await configuraciones.crearPorDefecto(usuario.id_usuario);
  await progreso.crear(usuario.id_usuario);

  return {
    id_usuario: usuario.id_usuario,
    nombre: usuario.nombre,
    correo: usuario.correo,
  };
}

/** Inicia sesion y devuelve el token junto con la configuracion (RF-03, RF-14). */
async function iniciarSesion({ correo, contrasena }) {
  const correoLimpio = String(correo || '').trim().toLowerCase();

  const usuario = await usuarios.leerPorCorreo(correoLimpio);
  if (!usuario) {
    throw new ErrorNoAutorizado('Correo o contrasena incorrectos.');
  }

  const coincide = await usuarios.verificarContrasena(
    String(contrasena || ''),
    usuario.contrasena_hash
  );

  if (!coincide) {
    throw new ErrorNoAutorizado('Correo o contrasena incorrectos.');
  }

  const sesion = await sesiones.crear(usuario.id_usuario);
  const configuracion = await configuraciones.leerPorUsuario(usuario.id_usuario);

  return {
    token: sesion.token,
    usuario: {
      id_usuario: usuario.id_usuario,
      nombre: usuario.nombre,
      correo: usuario.correo,
    },
    configuracion: configuracion
      ? require('../configuracion/servicio').aJson(configuracion)
      : null,
  };
}

/** Cierra la sesion activa (RF-04). */
async function cerrarSesion(token) {
  if (!token) {
    throw new ErrorNoAutorizado('No hay una sesion iniciada.');
  }
  return sesiones.cerrar(token);
}

/** Valida un token y devuelve la sesion, o null si no es valido. */
async function validarToken(token) {
  if (!token) return null;
  return sesiones.leerPorToken(token);
}

module.exports = {
  registrar,
  iniciarSesion,
  cerrarSesion,
  validarToken,
};
