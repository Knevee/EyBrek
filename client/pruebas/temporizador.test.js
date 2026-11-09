'use strict';

/**
 * EyBrek - Pruebas del Temporizador (cliente)
 *
 * Ejecutar con:  npm run pruebas   (en la carpeta client)
 *
 * El Temporizador no depende de Electron, asi que se prueba con Node.
 * La hora se controla con un reloj falso para no esperar de verdad.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const Temporizador = require('../src/modulos/temporizador/temporizador');
const { ventanaDeHorario } = Temporizador;

const MINUTO = 60 * 1000;

function configuracion(cambios = {}) {
  return {
    bloqueo_activo: true,
    intervalo_minutos: 30,
    duracion_minutos: 5,
    hora_inicio: '08:00',
    hora_fin: '21:00',
    notificaciones_activas: true,
    ...cambios,
  };
}

/** Crea un temporizador con un reloj que la prueba puede adelantar. */
function crear(horaInicial, opciones = {}) {
  let ahora = new Date(horaInicial);
  const temporizador = new Temporizador({ reloj: () => new Date(ahora), ...opciones });
  const eventos = [];
  temporizador.on('avisoProximo', () => eventos.push('avisoProximo'));
  temporizador.on('bloquear', () => eventos.push('bloquear'));

  return {
    temporizador,
    eventos,
    adelantar(minutos) {
      ahora = new Date(ahora.getTime() + minutos * MINUTO);
      temporizador.evaluar();
    },
  };
}

describe('ventanaDeHorario', () => {
  test('RF-16: dentro y fuera de un horario normal', () => {
    assert.equal(ventanaDeHorario(new Date(2026, 10, 2, 10, 0), '08:00', '21:00').dentro, true);
    assert.equal(ventanaDeHorario(new Date(2026, 10, 2, 22, 0), '08:00', '21:00').dentro, false);
  });

  test('RF-16: horario que cruza la medianoche', () => {
    assert.equal(ventanaDeHorario(new Date(2026, 10, 2, 23, 30), '22:00', '06:00').dentro, true);
    assert.equal(ventanaDeHorario(new Date(2026, 10, 3, 5, 0), '22:00', '06:00').dentro, true);
    assert.equal(ventanaDeHorario(new Date(2026, 10, 3, 12, 0), '22:00', '06:00').dentro, false);
  });
});

describe('Temporizador', () => {
  test('RF-16 y RF-17: avisa 1 minuto antes y bloquea al cumplirse el intervalo', () => {
    const prueba = crear(new Date(2026, 10, 2, 10, 0));
    prueba.temporizador.iniciar(configuracion());

    prueba.adelantar(28);
    assert.deepEqual(prueba.eventos, []);

    prueba.adelantar(1.5);
    assert.deepEqual(prueba.eventos, ['avisoProximo']);
    assert.equal(prueba.temporizador.descansoInminente(), true);

    prueba.adelantar(1);
    assert.deepEqual(prueba.eventos, ['avisoProximo', 'bloquear']);
    prueba.temporizador.detener();
  });

  test('RF-16: no bloquea con el bloqueo desactivado', () => {
    const prueba = crear(new Date(2026, 10, 2, 10, 0));
    prueba.temporizador.iniciar(configuracion({ bloqueo_activo: false }));
    prueba.adelantar(31);
    assert.deepEqual(prueba.eventos, []);
    prueba.temporizador.detener();
  });

  test('RF-16: no bloquea fuera del horario', () => {
    const prueba = crear(new Date(2026, 10, 2, 21, 30));
    prueba.temporizador.iniciar(configuracion());
    prueba.adelantar(31);
    assert.deepEqual(prueba.eventos, []);
    prueba.temporizador.detener();
  });

  test('RF-23: tras el desbloqueo el conteo vuelve a empezar', () => {
    const prueba = crear(new Date(2026, 10, 2, 10, 0));
    prueba.temporizador.iniciar(configuracion());
    prueba.adelantar(30);
    assert.ok(prueba.eventos.includes('bloquear'));

    prueba.adelantar(5);
    prueba.temporizador.reiniciar();
    prueba.eventos.length = 0;

    prueba.adelantar(29.5);
    assert.ok(!prueba.eventos.includes('bloquear'));
    prueba.adelantar(1);
    assert.ok(prueba.eventos.includes('bloquear'));
    prueba.temporizador.detener();
  });

  test('RF-24: detenido (sin sesion) no emite eventos', () => {
    const prueba = crear(new Date(2026, 10, 2, 10, 0));
    prueba.temporizador.iniciar(configuracion());
    prueba.temporizador.detener();
    prueba.adelantar(31);
    assert.deepEqual(prueba.eventos, []);
  });

  test('Inactividad: si la persona estuvo lejos lo que dura un descanso, no se bloquea', () => {
    let inactividadSegundos = 0;
    const prueba = crear(new Date(2026, 10, 2, 10, 0), {
      obtenerInactividadSegundos: () => inactividadSegundos,
    });
    prueba.temporizador.iniciar(configuracion());

    prueba.adelantar(25);
    inactividadSegundos = 5 * 60;
    prueba.adelantar(6);
    assert.ok(!prueba.eventos.includes('bloquear'));

    // Vuelve al equipo: el intervalo completo empieza de nuevo.
    inactividadSegundos = 0;
    prueba.adelantar(29.5);
    assert.ok(!prueba.eventos.includes('bloquear'));
    prueba.adelantar(1);
    assert.ok(prueba.eventos.includes('bloquear'));
    prueba.temporizador.detener();
  });
});
