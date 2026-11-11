'use strict';

/**
 * MODULO: Bloqueo de pantalla (cliente)
 * Responsabilidad: mostrar el bloqueo con la hora, la hora de fin y el
 * ejercicio visual.
 * Oculta: como se crean las ventanas a pantalla completa (una por cada
 * monitor) y como se lleva la cuenta regresiva.
 * Operaciones que ofrece: bloquear(duracionMin), estaBloqueado(),
 * solicitarFin().
 * Evento: bloqueoTerminado (callback alTerminar).
 */

const path = require('path');
const { BrowserWindow, screen } = require('electron');

// Margen para aceptar que la ventana pida terminar un poco antes por
// diferencias de reloj entre procesos.
const TOLERANCIA_FIN_MS = 1500;

let ventanas = [];
let datosBloqueo = null;
let cuentaRegresiva = null;
let vigilanciaFoco = null;
let alTerminar = null;
let cerrando = false;

/**
 * Crea la ventana de bloqueo para una pantalla.
 * La pantalla principal muestra el ejercicio; las demas solo el descanso.
 */
function crearVentana(pantalla, principal) {
  const { x, y, width, height } = pantalla.bounds;

  const ventana = new BrowserWindow({
    x,
    y,
    width,
    height,
    // Sin marco y del tamano de toda la pantalla (no del area de trabajo):
    // asi tapa tambien la barra de tareas. No se usa fullscreen porque en
    // Windows, con resizable en false, la ventana queda del tamano del
    // area de trabajo y la barra de tareas sigue visible.
    frame: false,
    thickFrame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    skipTaskbar: true,
    show: false,
    backgroundColor: '#4f4e80',
    webPreferences: {
      // Preload propio: la ventana de bloqueo solo puede leer sus datos.
      preload: path.join(__dirname, 'preload-bloqueo.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      devTools: false,
    },
  });

  // Queda por encima de las demas ventanas y en todos los escritorios.
  ventana.setAlwaysOnTop(true, 'screen-saver');
  ventana.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // No se puede navegar a otro sitio ni abrir ventanas.
  ventana.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  ventana.webContents.on('will-navigate', (evento) => evento.preventDefault());

  // Atajos que cierran, recargan o sacan de pantalla completa.
  ventana.webContents.on('before-input-event', (evento, tecla) => {
    const clave = String(tecla.key).toLowerCase();
    const bloqueada =
      (tecla.alt && clave === 'f4') ||
      (tecla.control && ['w', 'r', 'q', 'n', 't'].includes(clave)) ||
      ['f5', 'f11', 'escape'].includes(clave);
    if (bloqueada) evento.preventDefault();
  });

  // No se puede cerrar la ventana a mano (no hay opcion de omitir, RF-18).
  ventana.on('close', (evento) => {
    if (!cerrando) evento.preventDefault();
  });

  // Si el foco se va a una ventana que no es de bloqueo, vuelve al frente.
  ventana.on('blur', () => {
    setTimeout(() => {
      if (cerrando || ventana.isDestroyed() || !ventana.isVisible()) return;
      const enfocada = BrowserWindow.getFocusedWindow();
      if (!enfocada || !ventanas.includes(enfocada)) ventana.focus();
    }, 100);
  });

  ventana.loadFile(path.join(__dirname, '../../renderer/bloqueo.html'), {
    query: { pantalla: principal ? 'principal' : 'secundaria' },
  });

  ventana.once('ready-to-show', () => {
    if (ventana.isDestroyed()) return;
    ventana.show();
    ventana.setBounds(pantalla.bounds);
  });

  // mantenerAlFrente() la devuelve a este tamano si algo la achica.
  ventana.limitesPantalla = pantalla.bounds;
  return ventana;
}

/**
 * Cada medio segundo vuelve a poner el bloqueo encima de todo y le
 * devuelve el foco. Asi, si se abre el menu Inicio, la barra de tareas
 * u otra ventana (Win, Alt+Tab), el bloqueo la tapa enseguida.
 */
function mantenerAlFrente() {
  const vivas = ventanas.filter((ventana) => !ventana.isDestroyed() && ventana.isVisible());
  if (vivas.length === 0) return;

  for (const ventana of vivas) {
    ventana.setAlwaysOnTop(true, 'screen-saver');
    const actual = ventana.getBounds();
    const pantalla = ventana.limitesPantalla;
    if (actual.width !== pantalla.width || actual.height !== pantalla.height ||
        actual.x !== pantalla.x || actual.y !== pantalla.y) {
      ventana.setBounds(pantalla);
    }
    ventana.moveTop();
  }

  const enfocada = BrowserWindow.getFocusedWindow();
  if (!enfocada || !ventanas.includes(enfocada)) vivas[0].focus();
}

/** Cubre todas las pantallas conectadas. */
function cubrirPantallas() {
  const principal = screen.getPrimaryDisplay();
  for (const pantalla of screen.getAllDisplays()) {
    ventanas.push(crearVentana(pantalla, pantalla.id === principal.id));
  }
}

/** Si se conecta un monitor durante el descanso, tambien se bloquea. */
function alAgregarPantalla(_evento, pantalla) {
  if (!estaBloqueado()) return;
  ventanas.push(crearVentana(pantalla, false));
}

/**
 * Muestra el bloqueo de pantalla.
 * @param {object} opciones
 * @param {number} opciones.duracionMinutos  Duracion del bloqueo (RF-18).
 * @param {object} opciones.ejercicio        Ejercicio a mostrar (RF-20).
 * @param {Array}  opciones.catalogo         Catalogo de ejercicios.
 * @param {string} [opciones.horaInicio]     Para retomar un descanso que ya
 * @param {string} [opciones.horaFin]        habia empezado (ISO).
 * @param {Function} opciones.alTerminar    Se invoca cuando termina.
 */
function bloquear({ duracionMinutos, ejercicio, catalogo = [], horaInicio, horaFin, alTerminar: callback }) {
  cerrar();

  const duracion = Math.max(1, Number(duracionMinutos) || 1);
  const inicio = horaInicio ? new Date(horaInicio) : new Date();
  const fin = horaFin ? new Date(horaFin) : new Date(inicio.getTime() + duracion * 60 * 1000);

  datosBloqueo = {
    duracionMinutos: duracion,
    ejercicio,
    catalogo,
    horaInicio: inicio.toISOString(),
    horaFin: fin.toISOString(),
  };

  alTerminar = callback || null;

  cubrirPantallas();
  screen.on('display-added', alAgregarPantalla);
  vigilanciaFoco = setInterval(mantenerAlFrente, 500);

  // El proceso principal es la autoridad del tiempo: al cumplirse la
  // duracion configurada, la pantalla se desbloquea (RF-22).
  cuentaRegresiva = setTimeout(() => terminar(), Math.max(0, fin.getTime() - Date.now()));
}

/** Devuelve los datos actuales del bloqueo (para la ventana). */
function leerDatos() {
  return datosBloqueo;
}

/** Indica si hay un bloqueo en curso. */
function estaBloqueado() {
  return Boolean(datosBloqueo);
}

/**
 * La ventana pide terminar el bloqueo. Solo se acepta si ya se cumplio
 * la duracion: ninguna ventana puede acortar el descanso (RF-18).
 */
function solicitarFin() {
  if (!datosBloqueo) return false;
  const fin = new Date(datosBloqueo.horaFin).getTime();
  if (Date.now() + TOLERANCIA_FIN_MS < fin) return false;
  terminar();
  return true;
}

/** Cierra las ventanas de bloqueo y avisa que termino. */
function terminar() {
  cerrar();

  if (alTerminar) {
    const callback = alTerminar;
    alTerminar = null;
    callback();
  }
}

/** Cierra las ventanas sin disparar el aviso de terminacion. */
function cerrar() {
  cerrando = true;

  if (cuentaRegresiva) {
    clearTimeout(cuentaRegresiva);
    cuentaRegresiva = null;
  }
  if (vigilanciaFoco) {
    clearInterval(vigilanciaFoco);
    vigilanciaFoco = null;
  }

  screen.removeListener('display-added', alAgregarPantalla);

  for (const ventana of ventanas) {
    if (!ventana.isDestroyed()) ventana.destroy();
  }
  ventanas = [];
  datosBloqueo = null;

  // La bandera se limpia en el siguiente turno para que el evento
  // 'close' ya haya ocurrido.
  setTimeout(() => {
    cerrando = false;
  }, 0);
}

module.exports = { bloquear, terminar, cerrar, leerDatos, estaBloqueado, solicitarFin };
