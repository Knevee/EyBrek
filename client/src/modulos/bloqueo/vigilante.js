'use strict';

/**
 * MODULO: Bloqueo de pantalla (cliente) - Vigilante
 * Responsabilidad: que el descanso siga aunque EyBrek se cierre a la
 * fuerza (RF-18: el descanso no se puede omitir).
 * Oculta: el proceso aparte que vuelve a abrir la aplicacion y como se
 * vigilan el uno al otro.
 * Operaciones que ofrece: iniciar(rutaBloqueo), detener().
 *
 * Mientras dura el descanso, EyBrek y el vigilante se cuidan entre si:
 * el vigilante reabre EyBrek si lo cierran, y EyBrek vuelve a lanzar el
 * vigilante si es este el que se cierra.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { app } = require('electron');

const REVISION_MS = 3000;

let revision = null;
let rutaBloqueo = null;

/** Ruta del script; empaquetado, se lee desde fuera del archivo asar. */
function rutaScript() {
  return path.join(__dirname, 'vigilante-proceso.js').replace('app.asar', 'app.asar.unpacked');
}

function rutaPid() {
  return path.join(app.getPath('userData'), 'vigilante.pid');
}

/** Como volver a abrir EyBrek: oculto, para retomar el descanso. */
function comandoApp() {
  const args = app.isPackaged ? ['--oculto'] : [app.getAppPath(), '--oculto'];
  // Si se abrio con otra carpeta de datos, se reabre con la misma.
  const carpetaDatos = process.argv.find((arg) => arg.startsWith('--user-data-dir='));
  if (carpetaDatos) args.push(carpetaDatos);
  return [process.execPath, ...args];
}

function vigilanteVivo() {
  try {
    const pid = Number(fs.readFileSync(rutaPid(), 'utf8'));
    if (!pid) return false;
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
}

function lanzar() {
  const proceso = spawn(
    process.execPath,
    [rutaScript(), '--separar', String(process.pid), rutaBloqueo, rutaPid(), ...comandoApp()],
    {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    }
  );
  proceso.unref();
}

/** Empieza a vigilar el descanso guardado en rutaBloqueo. */
function iniciar(ruta) {
  detener();
  rutaBloqueo = ruta;
  if (!vigilanteVivo()) lanzar();

  // Si cierran el vigilante, se lanza otro.
  revision = setInterval(() => {
    if (!vigilanteVivo()) lanzar();
  }, REVISION_MS);
}

/**
 * Deja de vigilar. El proceso vigilante termina solo al ver que el
 * archivo del bloqueo ya no existe.
 */
function detener() {
  if (revision) {
    clearInterval(revision);
    revision = null;
  }
}

module.exports = { iniciar, detener };
