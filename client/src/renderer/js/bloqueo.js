'use strict';

/* =====================================================================
   EyBrek - Ventana de bloqueo
   La pausa pasa por dos pantallas (Figuras 6 y 7 del documento):
     1. Descanso: la hora, la hora de fin y los consejos. Se muestra
        40 segundos para que haya tiempo de leerla.
     2. Ejercicio: uno solo, el que toca en la rotacion (RF-20, RF-21),
        con un temporizador que dura lo que toma leerlo y hacerlo.
   Al terminar el ejercicio vuelve al descanso hasta desbloquear.

   Las fases se calculan con la hora de inicio del bloqueo: si EyBrek se
   reabre a mitad de un descanso, la pantalla sigue donde iba.
   ===================================================================== */

// Tiempo para leer la pantalla de descanso antes del ejercicio.
const SEGUNDOS_DE_LECTURA = 40;
// Si el ejercicio no trae su duracion (copia local antigua).
const SEGUNDOS_POR_DEFECTO = 40;

// Las pantallas secundarias solo muestran el descanso, sin la tarjeta.
const esSecundaria = new URLSearchParams(window.location.search).get('pantalla') === 'secundaria';
if (esSecundaria) document.body.classList.add('secundaria');

const reloj = document.getElementById('reloj');
const fecha = document.getElementById('fecha');
const textoFin = document.getElementById('texto-fin');
const temporizador = document.getElementById('temporizador');
const tituloEjercicio = document.getElementById('titulo-ejercicio');
const instrucciones = document.getElementById('instrucciones');
const barraTiempo = document.getElementById('barra-tiempo');
const consejosDescanso = document.getElementById('consejos-descanso');

let inicio = null;
let fin = null;
// Segundos desde el inicio en que empieza y termina el ejercicio.
let inicioEjercicio = 0;
let finEjercicio = 0;

/** Formatea una fecha como "9:30 a. m." */
function hora12(fecha) {
  const horas = fecha.getHours();
  const minutos = String(fecha.getMinutes()).padStart(2, '0');
  const sufijo = horas < 12 ? 'a. m.' : 'p. m.';
  const hora12 = horas % 12 === 0 ? 12 : horas % 12;
  return `${hora12}:${minutos} ${sufijo}`;
}

/** Formatea una fecha como "lun, 26 de mayo" (el CSS pone la mayuscula). */
function fechaLarga(fecha) {
  return fecha.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'long' })
    .replace('.', '');
}

/** 75 -> "01:15" */
function minutosSegundos(segundos) {
  const minutos = String(Math.floor(segundos / 60)).padStart(2, '0');
  return `${minutos}:${String(segundos % 60).padStart(2, '0')}`;
}

function cambiarFase(fase) {
  document.body.classList.toggle('fase-descanso', fase === 'descanso');
  document.body.classList.toggle('fase-ejercicios', fase === 'ejercicio');
}

function pintarReloj() {
  const ahora = new Date();
  reloj.textContent = String(ahora.getHours()).padStart(2, '0') + ':' +
    String(ahora.getMinutes()).padStart(2, '0');
  fecha.textContent = fechaLarga(ahora);
}

/** Cada segundo: decide la fase y avisa cuando se cumple el descanso. */
function avanzar() {
  pintarReloj();
  if (!inicio) return;

  if (fin.getTime() - Date.now() <= 0) {
    window.eybrek.terminarBloqueo();
    return;
  }

  if (esSecundaria) return;

  const transcurrido = Math.floor((Date.now() - inicio.getTime()) / 1000);
  if (transcurrido < inicioEjercicio || transcurrido >= finEjercicio) {
    cambiarFase('descanso');
    return;
  }

  const restante = finEjercicio - transcurrido;
  const duracion = finEjercicio - inicioEjercicio;
  temporizador.textContent = minutosSegundos(restante);
  barraTiempo.style.width = `${(restante / duracion) * 100}%`;
  cambiarFase('ejercicio');
}

async function iniciar() {
  const datos = await window.eybrek.datosBloqueo();
  pintarReloj();
  setInterval(avanzar, 1000);

  if (!datos || !datos.horaFin) return;

  inicio = new Date(datos.horaInicio || Date.now());
  fin = new Date(datos.horaFin);
  textoFin.textContent = `El descanso termina a las ${hora12(fin)}`;
  consejosDescanso.hidden = !datos.consejos;

  const ejercicio = datos.ejercicio;
  if (!ejercicio) return;

  // Los textos vienen del servidor: se insertan como texto, nunca como HTML.
  tituloEjercicio.textContent = ejercicio.titulo;
  instrucciones.textContent = ejercicio.instrucciones;

  // Si el descanso es corto, se lee menos para que el ejercicio quepa.
  const total = Math.floor((fin.getTime() - inicio.getTime()) / 1000);
  const duracion = Number(ejercicio.duracion_segundos) || SEGUNDOS_POR_DEFECTO;
  inicioEjercicio = Math.max(10, Math.min(SEGUNDOS_DE_LECTURA, total - duracion));
  finEjercicio = inicioEjercicio + duracion;
  temporizador.textContent = minutosSegundos(duracion);

  avanzar();
}

iniciar();
