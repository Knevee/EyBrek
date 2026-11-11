'use strict';

/**
 * Proceso vigilante del bloqueo.
 * Corre aparte de EyBrek (con ELECTRON_RUN_AS_NODE) mientras dura un
 * descanso. Si EyBrek se cierra a la fuerza (por ejemplo, con "Finalizar
 * tarea"), lo vuelve a abrir y el bloqueo sigue con el tiempo que faltaba.
 * Termina solo cuando el descanso acaba.
 *
 * Uso: vigilante-proceso.js [--separar] <pid> <archivo-bloqueo> <archivo-pid> <exe> [args...]
 */

const fs = require('fs');
const { spawn } = require('child_process');

const REVISION_MS = 1000;

const argumentos = process.argv.slice(2);

// Primer paso: se relanza a si mismo y termina, para quedar fuera del
// arbol de procesos de EyBrek. Asi "Finalizar tarea" no lo cierra junto
// con la aplicacion.
if (argumentos[0] === '--separar') {
  const hijo = spawn(process.execPath, [__filename, ...argumentos.slice(1)], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    env: process.env,
  });
  hijo.unref();
  process.exit(0);
}

const [pidTexto, archivoBloqueo, archivoPid, exe, ...argsApp] = argumentos;
const pidApp = Number(pidTexto);

/** EyBrek sigue vivo? */
function appViva() {
  try {
    process.kill(pidApp, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
}

/** El descanso sigue en curso segun el archivo que deja EyBrek. */
function descansoEnCurso() {
  try {
    const datos = JSON.parse(fs.readFileSync(archivoBloqueo, 'utf8').replace(/^﻿/, ''));
    return new Date(datos.horaFin).getTime() > Date.now();
  } catch (error) {
    return false;
  }
}

function terminar() {
  try {
    const guardado = Number(fs.readFileSync(archivoPid, 'utf8'));
    if (guardado === process.pid) fs.unlinkSync(archivoPid);
  } catch (error) {
    // Sin archivo: nada que limpiar.
  }
  process.exit(0);
}

// EyBrek consulta este archivo para saber si el vigilante sigue vivo.
fs.writeFileSync(archivoPid, String(process.pid));

setInterval(() => {
  if (!descansoEnCurso()) terminar();
  if (appViva()) return;

  // EyBrek se cerro a mitad del descanso: se vuelve a abrir.
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const app = spawn(exe, argsApp, { detached: true, stdio: 'ignore', env });
  app.unref();
  terminar();
}, REVISION_MS);
