'use strict';

/**
 * MODULO: Comunicacion y copia local (cliente) - Registro
 * Escribe un archivo de bitacora en el equipo del usuario.
 * Sirve para diagnosticar problemas, por ejemplo cuando el servidor
 * no esta disponible en la red local.
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const NOMBRE_ARCHIVO = 'eybrek.log';
const TAMANO_MAXIMO = 512 * 1024;

function rutaArchivo() {
  return path.join(app.getPath('userData'), NOMBRE_ARCHIVO);
}

/** Escribe una linea en la bitacora. */
function escribir(mensaje) {
  const linea = `[${new Date().toISOString()}] ${mensaje}\n`;

  try {
    const archivo = rutaArchivo();

    if (fs.existsSync(archivo) && fs.statSync(archivo).size > TAMANO_MAXIMO) {
      fs.renameSync(archivo, `${archivo}.anterior`);
    }

    fs.appendFileSync(archivo, linea, 'utf8');
  } catch (error) {
    /* la bitacora nunca debe detener la aplicacion */
  }

  console.log(linea.trim());
}

module.exports = { escribir, rutaArchivo };
