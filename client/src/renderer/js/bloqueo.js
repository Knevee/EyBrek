'use strict';

/* =====================================================================
   EyBrek - Ventana de bloqueo
   La pausa pasa por dos pantallas (Figuras 6 y 7 del documento):
     1. Descanso: anuncia la pausa con la hora y la hora de fin.
     2. Ejercicios: guia los 4 ejercicios, 20 segundos cada uno,
        empezando por el que toca en la rotacion (RF-20, RF-21).
   Al terminar los ejercicios vuelve al descanso hasta desbloquear.
   ===================================================================== */

const TONOS = ['tono-lavanda', 'tono-amarillo', 'tono-durazno', 'tono-rosa'];

const CONSEJOS = [
  'Sin prisa, tus ojos lo agradecerán',
  'Relaja la mandíbula y baja los hombros',
  'Mirar lejos ayuda a relajar tus ojos',
  'Parpadear mantiene tus ojos húmedos',
];

// Tiempo de cada ejercicio (Figura 7: temporizador de 00:20).
const SEGUNDOS_POR_EJERCICIO = 20;
// Cuanto se muestra el aviso de la pausa antes de empezar los ejercicios.
const SEGUNDOS_DE_AVISO = 8;

// Las pantallas secundarias solo muestran el descanso, sin la tarjeta.
const esSecundaria = new URLSearchParams(window.location.search).get('pantalla') === 'secundaria';
if (esSecundaria) document.body.classList.add('secundaria');

const reloj = document.getElementById('reloj');
const fecha = document.getElementById('fecha');
const textoFin = document.getElementById('texto-fin');
const contador = document.getElementById('contador');
const temporizador = document.getElementById('temporizador');
const consejo = document.getElementById('consejo');
const lista = document.getElementById('lista');
const consejosDescanso = document.getElementById('consejos-descanso');

let datos = null;
let fin = null;
let catalogo = [];
// Orden en que se hacen los ejercicios: desde el de la rotacion.
let secuencia = [];
let paso = -1;
let segundosPaso = SEGUNDOS_POR_EJERCICIO;
let segundosAviso = SEGUNDOS_DE_AVISO;

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

function cambiarFase(fase) {
  document.body.classList.toggle('fase-descanso', fase === 'descanso');
  document.body.classList.toggle('fase-ejercicios', fase === 'ejercicios');
}

function pintarReloj() {
  const ahora = new Date();
  reloj.textContent = String(ahora.getHours()).padStart(2, '0') + ':' +
    String(ahora.getMinutes()).padStart(2, '0');
  fecha.textContent = fechaLarga(ahora);
}

function revisarFin() {
  if (!fin) return;
  if (fin.getTime() - Date.now() <= 0) window.eybrek.terminarBloqueo();
}

function pintarTemporizador() {
  temporizador.textContent = `00:${String(segundosPaso).padStart(2, '0')}`;
}

/** Pinta la cuadricula 2x2 con los ejercicios del catalogo en su orden. */
function pintarLista() {
  lista.replaceChildren();
  const actual = secuencia[paso];

  catalogo.forEach((ejercicio, indice) => {
    const celda = document.createElement('div');
    celda.className = 'celda';
    if (actual && ejercicio.id_ejercicio === actual.id_ejercicio) celda.classList.add('actual');

    const numero = document.createElement('span');
    numero.className = `circulo ${TONOS[indice % TONOS.length]}`;
    numero.textContent = String(indice + 1);

    // Los textos vienen del servidor: se insertan como texto, nunca como HTML.
    const titulo = document.createElement('h2');
    titulo.textContent = `${ejercicio.titulo}:`;
    const texto = document.createElement('p');
    texto.textContent = ejercicio.instrucciones;

    celda.append(numero, titulo, texto);
    lista.appendChild(celda);
  });
}

function pintarPaso() {
  // Se numera como en la cuadricula, aunque la secuencia empiece por otro.
  const numero = catalogo.indexOf(secuencia[paso]) + 1;
  contador.textContent = `Ejercicio ${numero} de ${catalogo.length}`;
  segundosPaso = SEGUNDOS_POR_EJERCICIO;
  pintarTemporizador();
  pintarLista();
  if (datos.consejos) consejo.textContent = CONSEJOS[paso % CONSEJOS.length];
}

/** Un segundo de la pausa: aviso -> ejercicios -> descanso. */
function avanzar() {
  if (segundosAviso > 0) {
    segundosAviso -= 1;
    if (segundosAviso === 0 && secuencia.length > 0) {
      paso = 0;
      pintarPaso();
      cambiarFase('ejercicios');
    }
    return;
  }

  if (paso < 0 || paso >= secuencia.length) return;

  segundosPaso -= 1;
  if (segundosPaso > 0) {
    pintarTemporizador();
    return;
  }

  paso += 1;
  if (paso < secuencia.length) {
    pintarPaso();
  } else {
    cambiarFase('descanso');
  }
}

async function iniciar() {
  datos = await window.eybrek.datosBloqueo();
  pintarReloj();
  setInterval(pintarReloj, 1000);

  if (!datos || !datos.horaFin) return;

  fin = new Date(datos.horaFin);
  textoFin.textContent = `El descanso termina a las ${hora12(fin)}`;
  consejosDescanso.hidden = !datos.consejos;

  catalogo = Array.isArray(datos.catalogo) ? datos.catalogo : [];
  if (catalogo.length === 0 && datos.ejercicio) catalogo = [datos.ejercicio];
  const inicio = Math.max(0, catalogo.findIndex(
    (ejercicio) => datos.ejercicio && ejercicio.id_ejercicio === datos.ejercicio.id_ejercicio
  ));
  secuencia = catalogo.slice(inicio).concat(catalogo.slice(0, inicio));

  setInterval(revisarFin, 1000);
  if (!esSecundaria) setInterval(avanzar, 1000);
}

iniciar();
