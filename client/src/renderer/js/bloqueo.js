'use strict';

/* =====================================================================
   EyBrek - Ventana de bloqueo
   Muestra la hora, la hora de fin del descanso y el ejercicio visual.
   ===================================================================== */

const ICONO_POR_EJERCICIO = {
  'Cerca y lejos': 'i-sol',
  'Parpadeo': 'i-ojo',
  'En círculos': 'i-circulos',
  'Palmas': 'i-manos',
};

const TONOS = ['tono-amarillo', 'tono-lavanda', 'tono-verde', 'tono-rosa'];

const CONSEJOS = [
  'Sin prisa, tus ojos lo agradecerán.',
  'Relaja la mandíbula y baja los hombros.',
  'Mirar lejos ayuda a aflojar el músculo ciliar.',
  'Parpadear mantiene la superficie del ojo húmeda.',
  'Un vaso de agua también es parte del descanso.',
];

const SEGUNDOS_POR_EJERCICIO = 20;

const reloj = document.getElementById('reloj');
const fecha = document.getElementById('fecha');
const textoFin = document.getElementById('texto-fin');
const textoRestante = document.getElementById('restante');
const etiquetaDescanso = document.getElementById('etiqueta-descanso');
const lema = document.getElementById('lema');
const contador = document.getElementById('contador');
const temporizador = document.getElementById('temporizador');
const tituloEjercicio = document.getElementById('titulo-ejercicio');
const instrucciones = document.getElementById('instrucciones');
const siguiente = document.getElementById('siguiente');
const progreso = document.getElementById('progreso');
const lista = document.getElementById('lista');
const consejo = document.getElementById('consejo');

let datos = null;
let fin = null;
let ejercicioActual = null;
let segundosRestantes = SEGUNDOS_POR_EJERCICIO;
let indiceConsejo = 0;

/** Formatea una fecha como "9:30 a. m." */
function hora12(fecha) {
  const horas = fecha.getHours();
  const minutos = String(fecha.getMinutes()).padStart(2, '0');
  const sufijo = horas < 12 ? 'a. m.' : 'p. m.';
  const hora12 = horas % 12 === 0 ? 12 : horas % 12;
  return `${hora12}:${minutos} ${sufijo}`;
}

/** Formatea una fecha como "Lunes, 26 de mayo" */
function fechaLarga(fecha) {
  return fecha.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function pintarReloj() {
  const ahora = new Date();
  reloj.textContent = String(ahora.getHours()).padStart(2, '0') + ':' +
    String(ahora.getMinutes()).padStart(2, '0');
  fecha.textContent = fechaLarga(ahora);
}

function pintarFin() {
  if (!fin) return;
  textoFin.textContent = `El descanso termina a las ${hora12(fin)}`;
}

function pintarRestante() {
  if (!fin) return;
  const restante = Math.max(0, Math.round((fin.getTime() - Date.now()) / 1000));
  const minutos = Math.floor(restante / 60);
  const segundos = String(restante % 60).padStart(2, '0');
  textoRestante.textContent = `Faltan ${minutos} min ${segundos} s para desbloquear`;

  if (restante <= 0) {
    window.eybrek.terminarBloqueo();
  }
}

function pintarTemporizador() {
  const segundos = String(segundosRestantes).padStart(2, '0');
  temporizador.textContent = `00:${segundos}`;
}

/** Pinta el titulo, las instrucciones y el progreso del ejercicio actual. */
function pintarEjercicio() {
  if (!ejercicioActual) {
    tituloEjercicio.textContent = 'Respira';
    instrucciones.textContent = 'Cierra los ojos y descansa un momento.';
    contador.textContent = 'Ejercicio visual';
    siguiente.textContent = '';
    return;
  }

  tituloEjercicio.textContent = ejercicioActual.titulo;
  instrucciones.textContent = ejercicioActual.instrucciones;
  contador.textContent = `Ejercicio ${ejercicioActual.posicion} de ${ejercicioActual.total}`;

  const catalogo = datos && datos.catalogo ? datos.catalogo : [];
  const indiceActual = catalogo.findIndex(
    (ejercicio) => ejercicio.id_ejercicio === ejercicioActual.id_ejercicio
  );
  const siguienteEjercicio = catalogo.length
    ? catalogo[(indiceActual + 1) % catalogo.length]
    : null;

  siguiente.textContent = siguienteEjercicio
    ? `Siguiente: ${siguienteEjercicio.titulo}`
    : '';

  progreso.innerHTML = '';
  const total = ejercicioActual.total || catalogo.length || 1;
  for (let i = 0; i < total; i += 1) {
    const punto = document.createElement('span');
    if (i === ejercicioActual.posicion - 1) punto.classList.add('activo');
    progreso.appendChild(punto);
  }
}

/** Pinta la lista de ejercicios con su icono, numero e instruccion. */
function pintarLista() {
  const catalogo = datos && datos.catalogo ? datos.catalogo : [];
  lista.innerHTML = '';

  catalogo.forEach((ejercicio, indice) => {
    const item = document.createElement('div');
    item.className = 'item';

    if (ejercicioActual && ejercicio.id_ejercicio === ejercicioActual.id_ejercicio) {
      item.classList.add('actual');
    }

    const icono = document.createElement('span');
    icono.className = `item-icono ${TONOS[indice % TONOS.length]}`;
    icono.innerHTML = `<svg class="icono"><use href="#${ICONO_POR_EJERCICIO[ejercicio.titulo] || 'i-ojo'}"></use></svg>`;

    const cuerpo = document.createElement('div');
    cuerpo.className = 'item-cuerpo';
    cuerpo.innerHTML = `<h3>${ejercicio.posicion || indice + 1}. ${ejercicio.titulo}</h3>` +
      `<p>${ejercicio.instrucciones}</p>`;

    item.appendChild(icono);
    item.appendChild(cuerpo);
    lista.appendChild(item);
  });
}

function pintarConsejo() {
  if (!datos || !datos.consejos) {
    consejo.hidden = true;
    return;
  }
  consejo.hidden = false;
  consejo.textContent = CONSEJOS[indiceConsejo % CONSEJOS.length];
  indiceConsejo += 1;
}

async function iniciar() {
  datos = await window.eybrek.datosBloqueo();

  if (!datos || !datos.horaFin) {
    etiquetaDescanso.textContent = 'Pausa activa';
    lema.textContent = 'Tus ojos te lo agradecerán';
    return;
  }

  fin = new Date(datos.horaFin);
  ejercicioActual = datos.ejercicio || null;

  pintarReloj();
  pintarFin();
  pintarEjercicio();
  pintarLista();
  pintarTemporizador();
  pintarConsejo();

  setInterval(pintarReloj, 1000);
  setInterval(pintarRestante, 1000);

  // El temporizador del ejercicio guide el ritmo del descanso.
  setInterval(() => {
    segundosRestantes -= 1;
    if (segundosRestantes < 0) segundosRestantes = SEGUNDOS_POR_EJERCICIO;
    pintarTemporizador();
  }, 1000);

  setInterval(pintarConsejo, 12000);
}

iniciar();
