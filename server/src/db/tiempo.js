'use strict';

/**
 * Utilidad de tiempo con formato portable entre MySQL y SQLite.
 * Devuelve la fecha y hora local en formato 'YYYY-MM-DD HH:MM:SS'.
 */

function ahora() {
  const momento = new Date();
  const dos = (numero) => String(numero).padStart(2, '0');

  return (
    `${momento.getFullYear()}-${dos(momento.getMonth() + 1)}-${dos(momento.getDate())} ` +
    `${dos(momento.getHours())}:${dos(momento.getMinutes())}:${dos(momento.getSeconds())}`
  );
}

module.exports = { ahora };
