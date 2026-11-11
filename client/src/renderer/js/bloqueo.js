'use strict';

/* =====================================================================
   EyBrek - Ventana de bloqueo
   La pausa pasa por dos pantallas (Figuras 6 y 7 del documento):
     1. Descanso: la hora, la hora de fin y los consejos. Se muestra
        40 segundos para que haya tiempo de leerla.
     2. Ejercicio: uno solo, el que toca en la rotacion (RF-20, RF-21),
        dividido en 4 pasos que se recorren uno a uno con sus segundos.
        Los 4 pasos se repiten 2 o 3 rondas, con 5 segundos de descanso
        entre una ronda y otra.
   Al terminar las rondas vuelve al descanso hasta desbloquear.

   Las fases se calculan con la hora de inicio del bloqueo: si EyBrek se
   reabre a mitad de un descanso, la pantalla sigue donde iba.
   ===================================================================== */

// Tiempo para leer la pantalla de descanso antes del ejercicio.
const SEGUNDOS_DE_LECTURA = 40;
// Descanso corto entre una ronda y la siguiente.
const SEGUNDOS_ENTRE_RONDAS = 5;
// Si el ejercicio no trae su duracion (copia local antigua).
const SEGUNDOS_POR_DEFECTO = 40;

const TONOS = ['tono-lavanda', 'tono-amarillo', 'tono-durazno', 'tono-rosa'];

// Las pantallas secundarias solo muestran el descanso, sin la tarjeta.
const esSecundaria = new URLSearchParams(window.location.search).get('pantalla') === 'secundaria';
if (esSecundaria) document.body.classList.add('secundaria');

const reloj = document.getElementById('reloj');
const relojSufijo = document.getElementById('reloj-sufijo');
const fecha = document.getElementById('fecha');
const textoFin = document.getElementById('texto-fin');
const ronda = document.getElementById('ronda');
const temporizador = document.getElementById('temporizador');
const lemaEjercicio = document.getElementById('lema-ejercicio');
const tituloEjercicio = document.getElementById('titulo-ejercicio');
const instrucciones = document.getElementById('instrucciones');
const listaPasos = document.getElementById('pasos');
const barraTiempo = document.getElementById('barra-tiempo');
const consejosDescanso = document.getElementById('consejos-descanso');

let inicio = null;
let fin = null;
// Segundo (desde el inicio del bloqueo) en que empieza el ejercicio.
let inicioEjercicio = 0;
// Tramos del ejercicio en orden: pasos de cada ronda y pausas.
let tramos = [];
let totalEjercicio = 0;
let celdas = [];

/** Formatea una fecha como "9:30 a. m." */
function hora12(fecha) {
  const { hora, sufijo } = partesHora12(fecha);
  return `${hora} ${sufijo}`;
}

/** "21:05" -> { hora: "9:05", sufijo: "p. m." } */
function partesHora12(fecha) {
  const horas = fecha.getHours();
  const minutos = String(fecha.getMinutes()).padStart(2, '0');
  return {
    hora: `${horas % 12 === 0 ? 12 : horas % 12}:${minutos}`,
    sufijo: horas < 12 ? 'a. m.' : 'p. m.',
  };
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
  const { hora, sufijo } = partesHora12(new Date());
  reloj.textContent = hora;
  relojSufijo.textContent = sufijo;
  fecha.textContent = fechaLarga(new Date());
}

/**
 * Arma la secuencia del ejercicio: los 4 pasos por cada ronda, con una
 * pausa corta entre rondas. Si el ejercicio no trae pasos (datos
 * antiguos), se usa un solo paso con sus instrucciones.
 */
function armarTramos(ejercicio) {
  let pasos = Array.isArray(ejercicio.pasos) ? ejercicio.pasos : [];
  pasos = pasos.filter((paso) => paso && paso.texto && Number(paso.segundos) > 0);
  if (pasos.length === 0) {
    pasos = [{
      texto: ejercicio.instrucciones,
      segundos: Number(ejercicio.duracion_segundos) || SEGUNDOS_POR_DEFECTO,
    }];
  }

  const rondas = Math.max(1, Number(ejercicio.repeticiones) || 1);
  const lista = [];
  for (let numero = 1; numero <= rondas; numero += 1) {
    pasos.forEach((paso, indice) => {
      lista.push({ tipo: 'paso', ronda: numero, rondas, indice, segundos: Number(paso.segundos) });
    });
    if (numero < rondas) lista.push({ tipo: 'pausa', ronda: numero, rondas, segundos: SEGUNDOS_ENTRE_RONDAS });
  }
  return { pasos, lista };
}

/** Pinta la cuadricula 2x2 con los pasos del ejercicio. */
function pintarPasos(pasos) {
  listaPasos.replaceChildren();
  celdas = pasos.map((paso, indice) => {
    const celda = document.createElement('div');
    celda.className = 'celda';

    const numero = document.createElement('span');
    numero.className = `circulo ${TONOS[indice % TONOS.length]}`;
    numero.textContent = String(indice + 1);

    // Los textos vienen del servidor: se insertan como texto, nunca como HTML.
    const texto = document.createElement('p');
    texto.textContent = paso.texto;
    const segundos = document.createElement('span');
    segundos.className = 'segundos';
    segundos.textContent = `${paso.segundos} segundos`;

    celda.append(numero, texto, segundos);
    listaPasos.appendChild(celda);
    return celda;
  });
}

/** Marca el paso actual y los ya hechos en la ronda en curso. */
function marcarPasos(indiceActual) {
  celdas.forEach((celda, indice) => {
    celda.classList.toggle('actual', indice === indiceActual);
    celda.classList.toggle('hecha', indiceActual === null || indice < indiceActual);
  });
}

/** Pinta el tramo del ejercicio que corresponde al segundo dado. */
function pintarEjercicio(segundoEjercicio) {
  let acumulado = 0;
  for (const tramo of tramos) {
    if (segundoEjercicio < acumulado + tramo.segundos) {
      const restante = acumulado + tramo.segundos - segundoEjercicio;
      ronda.textContent = `Ronda ${tramo.ronda} de ${tramo.rondas}`;
      temporizador.textContent = minutosSegundos(restante);

      if (tramo.tipo === 'pausa') {
        lemaEjercicio.textContent = 'Descansa los ojos, ya viene la siguiente ronda';
        marcarPasos(null);
      } else {
        lemaEjercicio.textContent = `Paso ${tramo.indice + 1} de ${celdas.length}`;
        marcarPasos(tramo.indice);
      }
      break;
    }
    acumulado += tramo.segundos;
  }

  const restanteTotal = totalEjercicio - segundoEjercicio;
  barraTiempo.style.width = `${(restanteTotal / totalEjercicio) * 100}%`;
}

/** Cada segundo: decide la fase y avisa cuando se cumple el descanso. */
function avanzar() {
  pintarReloj();
  if (!inicio) return;

  if (fin.getTime() - Date.now() <= 0) {
    window.eybrek.terminarBloqueo();
    return;
  }

  if (esSecundaria || tramos.length === 0) return;

  const transcurrido = Math.floor((Date.now() - inicio.getTime()) / 1000);
  const segundoEjercicio = transcurrido - inicioEjercicio;
  if (segundoEjercicio < 0 || segundoEjercicio >= totalEjercicio) {
    cambiarFase('descanso');
    return;
  }

  pintarEjercicio(segundoEjercicio);
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

  tituloEjercicio.textContent = ejercicio.titulo;
  instrucciones.textContent = ejercicio.instrucciones;

  const { pasos, lista } = armarTramos(ejercicio);
  tramos = lista;
  totalEjercicio = tramos.reduce((suma, tramo) => suma + tramo.segundos, 0);
  pintarPasos(pasos);

  // Si el descanso es corto, se lee menos para que el ejercicio quepa.
  const total = Math.floor((fin.getTime() - inicio.getTime()) / 1000);
  inicioEjercicio = Math.max(10, Math.min(SEGUNDOS_DE_LECTURA, total - totalEjercicio));

  avanzar();
}

iniciar();
