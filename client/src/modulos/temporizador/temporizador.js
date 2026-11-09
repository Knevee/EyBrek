'use strict';

const { EventEmitter } = require('events');

/**
 * MODULO: Temporizador (cliente)
 * Responsabilidad: decidir cuando bloquear. Cuenta el intervalo y
 * verifica el horario y el estado del bloqueo.
 * Oculta: el calculo del intervalo, la comprobacion del horario y el
 * reloj interno.
 *
 * Operaciones que ofrece: iniciar(configuracion), detener(), reiniciar().
 *
 * PATRON OBSERVER
 * El Temporizador emite eventos y no necesita saber quien los escucha.
 * La Interfaz y el Bloqueo de pantalla se suscriben a ellos. Agregar una
 * nueva reaccion a un evento no obliga a modificar este modulo.
 *
 * Eventos emitidos:
 *   'avisoProximo' -> falta 1 minuto para el bloqueo (RF-17)
 *   'bloquear'     -> se cumplio el intervalo (RF-16)
 */

const SEGUNDO = 1000;
const MINUTO = 60 * SEGUNDO;

/** Convierte una hora "HH:MM" a minutos desde medianoche. */
function aMinutos(hora) {
  const partes = String(hora || '00:00').split(':');
  const horas = Number(partes[0]) || 0;
  const minutos = Number(partes[1]) || 0;
  return horas * 60 + minutos;
}

/** Devuelve la fecha de hoy a la hora indicada. */
function momentoDelDia(fecha, hora) {
  const [horas, minutos] = String(hora || '00:00').split(':').map(Number);
  const momento = new Date(fecha);
  momento.setHours(horas || 0, minutos || 0, 0, 0);
  return momento;
}

/**
 * Calcula la ventana de horario del dia.
 * Si la hora de fin es menor que la de inicio, la ventana cruza la
 * medianoche (por ejemplo 22:00 a 06:00).
 */
function ventanaDeHorario(fecha, horaInicio, horaFin) {
  const inicioMin = aMinutos(horaInicio);
  const finMin = aMinutos(horaFin);
  const ahoraMin = fecha.getHours() * 60 + fecha.getMinutes();

  if (finMin > inicioMin) {
    const inicio = momentoDelDia(fecha, horaInicio);
    const fin = momentoDelDia(fecha, horaFin);
    return { dentro: ahoraMin >= inicioMin && ahoraMin <= finMin, inicio, fin };
  }

  const inicio = momentoDelDia(fecha, horaInicio);
  const fin = momentoDelDia(fecha, horaFin);

  if (ahoraMin >= inicioMin) {
    return { dentro: true, inicio, fin: new Date(fin.getTime() + 24 * 60 * MINUTO) };
  }
  if (ahoraMin <= finMin) {
    return {
      dentro: true,
      inicio: new Date(inicio.getTime() - 24 * 60 * MINUTO),
      fin,
    };
  }
  return { dentro: false, inicio, fin };
}

class Temporizador extends EventEmitter {
  /**
   * @param {object} [opciones]
   * @param {Function} [opciones.obtenerInactividadSegundos] Segundos que
   *   lleva el equipo sin uso. Si alcanzan la duracion del descanso, la
   *   persona ya descanso y el conteo vuelve a empezar.
   * @param {Function} [opciones.reloj] Devuelve la hora actual (pruebas).
   */
  constructor(opciones = {}) {
    super();
    this.obtenerInactividadSegundos = opciones.obtenerInactividadSegundos || null;
    this.ahora = opciones.reloj || (() => new Date());
    this.configuracion = null;
    this.sesionActiva = false;
    this.bloqueando = false;
    this.inicioSesion = null;
    this.inicioCiclo = null;
    this.proximoBloqueo = null;
    this.avisoEnviado = false;
    this.reloj = null;
  }

  /**
   * Arranca el conteo con la configuracion del usuario.
   * El conteo arranca en el limite de la ventana de horario o al iniciar
   * la sesion, lo que ocurra mas tarde (RF-16).
   */
  iniciar(configuracion) {
    this.configuracion = configuracion;
    this.sesionActiva = true;
    this.inicioSesion = this.ahora();
    this.reiniciar();
    this.arrancarReloj();
  }

  /** Detiene el conteo y los bloqueos: no hay sesion iniciada (RF-24). */
  detener() {
    this.sesionActiva = false;
    this.bloqueando = false;
    this.inicioCiclo = null;
    this.proximoBloqueo = null;
    this.avisoEnviado = false;
    this.detenerReloj();
  }

  /** Reinicia el conteo del intervalo desde este momento (RF-23). */
  reiniciar() {
    this.bloqueando = false;
    this.avisoEnviado = false;
    this.inicioCiclo = this.ahora();

    if (this.configuracion) {
      this.proximoBloqueo = new Date(
        this.inicioCiclo.getTime() + this.configuracion.intervalo_minutos * MINUTO
      );
    } else {
      this.proximoBloqueo = null;
    }
  }

  /** Aplica una configuracion nueva y vuelve a contar desde ahora. */
  actualizarConfiguracion(configuracion) {
    this.configuracion = configuracion;
    if (this.sesionActiva) this.reiniciar();
  }

  /** Indica que hay un bloqueo en curso: el conteo se pausa. */
  marcarBloqueoEnCurso(activo) {
    this.bloqueando = activo;
  }

  /** Minutos que faltan para el proximo bloqueo (null si no aplica). */
  minutosParaElProximoBloqueo() {
    if (!this.proximoBloqueo) return null;
    const faltante = this.proximoBloqueo.getTime() - this.ahora().getTime();
    return Math.max(0, Math.ceil(faltante / MINUTO));
  }

  /** Indica si el descanso empieza en menos de un minuto. */
  descansoInminente() {
    if (!this.sesionActiva || !this.proximoBloqueo) return false;
    if (!this.configuracion || !this.configuracion.bloqueo_activo) return false;
    return this.proximoBloqueo.getTime() - this.ahora().getTime() <= MINUTO;
  }

  /** La persona lleva sin usar el equipo al menos lo que dura un descanso. */
  yaDescanso() {
    if (!this.obtenerInactividadSegundos || !this.configuracion) return false;
    const inactividad = Number(this.obtenerInactividadSegundos()) || 0;
    return inactividad * SEGUNDO >= this.configuracion.duracion_minutos * MINUTO;
  }

  arrancarReloj() {
    this.detenerReloj();
    this.reloj = setInterval(() => this.evaluar(), SEGUNDO);
  }

  detenerReloj() {
    if (this.reloj) {
      clearInterval(this.reloj);
      this.reloj = null;
    }
  }

  /** Evalua en cada instante si toca avisar o bloquear. */
  evaluar() {
    if (!this.sesionActiva || !this.configuracion) return;
    if (this.bloqueando) return;
    if (!this.configuracion.bloqueo_activo) return;

    const ahora = this.ahora();
    const ventana = ventanaDeHorario(
      ahora,
      this.configuracion.hora_inicio,
      this.configuracion.hora_fin
    );

    // Fuera del horario no hay conteo ni bloqueos (RF-16).
    if (!ventana.dentro) {
      this.inicioCiclo = null;
      this.proximoBloqueo = null;
      this.avisoEnviado = false;
      return;
    }

    if (!this.inicioCiclo) {
      const base = Math.max(
        ventana.inicio.getTime(),
        this.inicioSesion ? this.inicioSesion.getTime() : ventana.inicio.getTime()
      );
      this.inicioCiclo = new Date(base);
      this.proximoBloqueo = new Date(
        base + this.configuracion.intervalo_minutos * MINUTO
      );
    }

    // Si la persona estuvo lejos del equipo lo que dura un descanso, ese
    // tiempo cuenta como pausa: el intervalo empieza de nuevo.
    if (this.yaDescanso()) {
      this.reiniciar();
      return;
    }

    if (ahora.getTime() >= this.proximoBloqueo.getTime()) {
      this.bloqueando = true;
      this.avisoEnviado = false;
      this.emit('bloquear', { momento: this.proximoBloqueo });
      return;
    }

    const faltante = this.proximoBloqueo.getTime() - ahora.getTime();
    if (!this.avisoEnviado && faltante <= MINUTO) {
      this.avisoEnviado = true;
      this.emit('avisoProximo', { momento: this.proximoBloqueo });
    }
  }
}

module.exports = Temporizador;
module.exports.ventanaDeHorario = ventanaDeHorario;
module.exports.aMinutos = aMinutos;
