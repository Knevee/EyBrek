'use strict';

/**
 * MODULO: Ejercicios (servidor)
 * Responsabilidad: entregar el siguiente ejercicio de la rotacion.
 * Oculta: como se calcula la rotacion y como se guarda el progreso.
 * Operacion: siguienteEjercicio.
 */

const ejercicios = require('../acceso-a-datos/ejercicios');
const progreso = require('../acceso-a-datos/progreso');

/** Los pasos se guardan como texto JSON: se entregan ya como lista. */
function leerPasos(texto) {
  try {
    const pasos = JSON.parse(texto || '[]');
    return Array.isArray(pasos) ? pasos : [];
  } catch (error) {
    return [];
  }
}

/** Forma comun de un ejercicio en las respuestas de la API. */
function formatear(ejercicio, indice, total) {
  return {
    id_ejercicio: ejercicio.id_ejercicio,
    titulo: ejercicio.titulo,
    instrucciones: ejercicio.instrucciones,
    orden: ejercicio.orden,
    duracion_segundos: ejercicio.duracion_segundos,
    pasos: leerPasos(ejercicio.pasos),
    repeticiones: ejercicio.repeticiones,
    posicion: indice + 1,
    total,
  };
}

/** Devuelve el catalogo completo sin tocar el progreso del usuario. */
async function catalogo() {
  const lista = await ejercicios.leerTodos();
  return lista.map((ejercicio, indice) => formatear(ejercicio, indice, lista.length));
}

/**
 * Entrega el siguiente ejercicio de la rotacion y registra cual fue (RF-20, RF-21).
 * Cuando el ultimo ejercicio fue el final de la lista, vuelve al primero.
 */
async function siguienteEjercicio(idUsuario) {
  const lista = await ejercicios.leerTodos();

  if (lista.length === 0) {
    const error = new Error('No hay ejercicios disponibles en el catalogo.');
    error.codigo = 503;
    throw error;
  }

  const avance = await progreso.leerPorUsuario(idUsuario);
  let indice = 0;

  if (avance && avance.id_ultimo_ejercicio) {
    const posicion = lista.findIndex(
      (ejercicio) => ejercicio.id_ejercicio === avance.id_ultimo_ejercicio
    );
    indice = posicion >= 0 ? (posicion + 1) % lista.length : 0;
  }

  const elegido = lista[indice];
  await progreso.guardarUltimo(idUsuario, elegido.id_ejercicio);

  return formatear(elegido, indice, lista.length);
}

module.exports = { siguienteEjercicio, catalogo };
