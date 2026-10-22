'use strict';

/**
 * MODULO: Configuracion (servidor)
 * Responsabilidad: guardar, leer y validar la configuracion del usuario.
 * Oculta: las reglas de rangos y los valores por defecto.
 * Operaciones: obtener, guardar, crearPorDefecto.
 */

const configuraciones = require('../acceso-a-datos/configuraciones');
const ErrorValidacion = require('../../errores/ErrorValidacion');

// Reglas del RF-11
const LIMITES = {
  intervaloMinimo: 15,      // 15 minutos
  intervaloMaximo: 480,     // 8 horas
  duracionMinima: 1,        // 1 minuto
  duracionMaxima: 30,       // 30 minutos
};

const FORMATO_HORA = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;

/** Normaliza una hora a HH:MM. Devuelve null si el formato no es valido. */
function normalizarHora(valor) {
  const coincidencia = FORMATO_HORA.exec(String(valor || '').trim());
  if (!coincidencia) return null;
  return `${coincidencia[1]}:${coincidencia[2]}`;
}

/** Convierte una fila de la base de datos en el formato que usa el cliente. */
function aJson(fila) {
  if (!fila) return null;
  return {
    bloqueo_activo: Boolean(fila.bloqueo_activo),
    intervalo_minutos: Number(fila.intervalo_minutos),
    duracion_minutos: Number(fila.duracion_minutos),
    hora_inicio: normalizarHora(fila.hora_inicio),
    hora_fin: normalizarHora(fila.hora_fin),
    notificaciones_activas: Boolean(fila.notificaciones_activas),
  };
}

/**
 * Valida la configuracion recibida (RF-11).
 * Devuelve la lista de mensajes de error y los valores normalizados.
 */
function validar(datos) {
  const errores = [];

  const intervalo = Number(datos.intervalo_minutos);
  const duracion = Number(datos.duracion_minutos);
  const horaInicio = normalizarHora(datos.hora_inicio);
  const horaFin = normalizarHora(datos.hora_fin);

  if (!Number.isFinite(intervalo) || !Number.isInteger(intervalo)) {
    errores.push('El intervalo debe ser un numero entero de minutos.');
  } else if (
    intervalo < LIMITES.intervaloMinimo ||
    intervalo > LIMITES.intervaloMaximo
  ) {
    errores.push(
      'El intervalo debe estar entre 15 minutos y 8 horas (480 minutos).'
    );
  }

  if (!Number.isFinite(duracion) || !Number.isInteger(duracion)) {
    errores.push('La duracion debe ser un numero entero de minutos.');
  } else if (
    duracion < LIMITES.duracionMinima ||
    duracion > LIMITES.duracionMaxima
  ) {
    errores.push('La duracion del bloqueo debe estar entre 1 y 30 minutos.');
  } else if (Number.isFinite(intervalo) && duracion >= intervalo) {
    errores.push('La duracion del bloqueo debe ser menor que el intervalo.');
  }

  if (!horaInicio) {
    errores.push('La hora de inicio no tiene un formato valido.');
  }

  if (!horaFin) {
    errores.push('La hora de fin no tiene un formato valido.');
  }

  if (horaInicio && horaFin && horaInicio === horaFin) {
    errores.push('La hora de fin debe ser distinta de la hora de inicio.');
  }

  return {
    errores,
    valores: {
      bloqueo_activo: Boolean(datos.bloqueo_activo),
      intervalo_minutos: intervalo,
      duracion_minutos: duracion,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      notificaciones_activas: Boolean(datos.notificaciones_activas),
    },
  };
}

/** Obtiene la configuracion del usuario (RF-13, RF-14). */
async function obtener(idUsuario) {
  const fila = await configuraciones.leerPorUsuario(idUsuario);
  if (!fila) {
    return aJson(await configuraciones.crearPorDefecto(idUsuario));
  }
  return aJson(fila);
}

/** Guarda la configuracion validada del usuario (RF-10, RF-11, RF-13). */
async function guardar(idUsuario, datos) {
  const { errores, valores } = validar(datos || {});

  if (errores.length > 0) {
    throw new ErrorValidacion(errores[0]);
  }

  const guardada = await configuraciones.guardar(idUsuario, {
    ...valores,
    hora_inicio: `${valores.hora_inicio}:00`,
    hora_fin: `${valores.hora_fin}:00`,
  });

  return aJson(guardada);
}

/** Crea la configuracion por defecto (RF-12). */
async function crearPorDefecto(idUsuario) {
  return aJson(await configuraciones.crearPorDefecto(idUsuario));
}

module.exports = {
  obtener,
  guardar,
  crearPorDefecto,
  validar,
  normalizarHora,
  aJson,
  LIMITES,
};
