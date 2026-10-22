'use strict';

/**
 * MODULO: Bloqueo de pantalla (cliente)
 * Responsabilidad: mostrar el bloqueo con la hora, la hora de fin y el
 * ejercicio visual.
 * Oculta: como se crea la ventana a pantalla completa y como se lleva la
 * cuenta regresiva.
 * Operacion que ofrece: bloquear(duracionMin).
 * Evento: bloqueoTerminado.
 */

const path = require('path');
const { BrowserWindow, screen } = require('electron');

let ventanaBloqueo = null;
let datosBloqueo = null;
let cuentaRegresiva = null;
let alTerminar = null;
let cerrando = false;

/** Crea la ventana de bloqueo a pantalla completa. */
function crearVentana() {
  const pantalla = screen.getPrimaryDisplay();
  const { width, height } = pantalla.workAreaSize;

  const ventana = new BrowserWindow({
    width,
    height,
    frame: false,
    fullscreen: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    skipTaskbar: true,
    show: false,
    backgroundColor: '#4f4e80',
    webPreferences: {
      preload: path.join(__dirname, '../../preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  // Queda por encima de las demas ventanas y en todos los escritorios.
  ventana.setAlwaysOnTop(true, 'screen-saver');
  ventana.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // No se puede navegar a otro sitio ni abrir ventanas.
  ventana.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  ventana.webContents.on('will-navigate', (evento) => evento.preventDefault());

  // No se puede cerrar la ventana a mano (no hay opcion de omitir, RF-18).
  ventana.on('close', (evento) => {
    if (!cerrando) evento.preventDefault();
  });

  // Si pierde el foco, vuelve al frente.
  ventana.on('blur', () => {
    if (!cerrando && ventana.isVisible()) ventana.focus();
  });

  ventana.loadFile(path.join(__dirname, '../../renderer/bloqueo.html'));

  return ventana;
}

/**
 * Muestra el bloqueo de pantalla.
 * @param {object} opciones
 * @param {number} opciones.duracionMinutos  Duracion del bloqueo (RF-18).
 * @param {object} opciones.ejercicio        Ejercicio a mostrar (RF-20).
 * @param {Array}  opciones.catalogo         Catalogo de ejercicios.
 * @param {Function} opciones.alTerminar    Se invoca cuando termina.
 */
function bloquear({ duracionMinutos, ejercicio, catalogo = [], alTerminar: callback }) {
  cerrar();

  const duracion = Math.max(1, Number(duracionMinutos) || 1);
  const fin = new Date(Date.now() + duracion * 60 * 1000);

  datosBloqueo = {
    duracionMinutos: duracion,
    ejercicio,
    catalogo,
    horaInicio: new Date().toISOString(),
    horaFin: fin.toISOString(),
  };

  alTerminar = callback || null;

  ventanaBloqueo = crearVentana();
  ventanaBloqueo.once('ready-to-show', () => {
    if (ventanaBloqueo) ventanaBloqueo.show();
  });

  // Utilidad de apoyo: EYBREK_CAPTURA_BLOQUEO=ruta.png guarda una imagen
  // de la pantalla de bloqueo. Se usa para documentar el proyecto.
  if (process.env.EYBREK_CAPTURA_BLOQUEO) {
    setTimeout(async () => {
      try {
        const imagen = await ventanaBloqueo.webContents.capturePage();
        require('fs').writeFileSync(process.env.EYBREK_CAPTURA_BLOQUEO, imagen.toPNG());
        require('../comunicacion/registro').escribir(
          `Captura del bloqueo guardada en ${process.env.EYBREK_CAPTURA_BLOQUEO}`
        );
      } catch (error) {
        require('../comunicacion/registro').escribir(
          `No se pudo capturar el bloqueo: ${error.message}`
        );
      }
    }, 4000);
  }

  // El proceso principal es la autoridad del tiempo: al cumplirse la
  // duracion configurada, la pantalla se desbloquea (RF-22).
  cuentaRegresiva = setTimeout(() => terminar(), duracion * 60 * 1000);
}

/** Devuelve los datos actuales del bloqueo (para la ventana). */
function leerDatos() {
  return datosBloqueo;
}

/** Cierra la ventana de bloqueo y avisa que termino. */
function terminar() {
  cerrar();

  if (alTerminar) {
    const callback = alTerminar;
    alTerminar = null;
    callback();
  }
}

/** Cierra la ventana sin disparar el aviso de terminacion. */
function cerrar() {
  cerrando = true;

  if (cuentaRegresiva) {
    clearTimeout(cuentaRegresiva);
    cuentaRegresiva = null;
  }

  if (ventanaBloqueo && !ventanaBloqueo.isDestroyed()) {
    ventanaBloqueo.destroy();
  }
  ventanaBloqueo = null;

  // La bandera se limpia en el siguiente turno para que el evento
  // 'close' ya haya ocurrido.
  setTimeout(() => {
    cerrando = false;
  }, 0);
}

module.exports = { bloquear, terminar, cerrar, leerDatos };
