'use strict';

/**
 * Arranque del servidor de EyBrek.
 * Se ejecuta en un computador propio (sin nube), en la red local.
 *
 * Por defecto usa SQLite: no necesita instalar MySQL, ni crear usuarios,
 * ni contrasenas. La base de datos es un archivo que se crea solo.
 * Para usar MySQL: DB_MOTOR=mysql en el archivo .env
 */

const crearAplicacion = require('./app');
const entorno = require('./config/entorno');
const db = require('./db/conexion');

// El modulo node:sqlite todavia se marca como experimental en Node.js.
// Se oculta solo ese aviso para que la consola quede limpia.
process.removeAllListeners('warning');
process.on('warning', (aviso) => {
  if (aviso.name === 'ExperimentalWarning' && /SQLite/i.test(aviso.message)) return;
  console.warn(aviso);
});

async function iniciar() {
  try {
    const motor = await db.iniciar();
    console.log(
      `[EyBrek] Base de datos lista (${motor.nombre}` +
        `${motor.nombre === 'sqlite' ? `: ${entorno.baseDatos.rutaSQLite}` : ''})`
    );
  } catch (error) {
    console.error('[EyBrek] No se pudo iniciar la base de datos:', error.message);
    process.exit(1);
  }

  const app = crearAplicacion();

  const servidor = app.listen(entorno.puerto, '0.0.0.0', () => {
    console.log(`[EyBrek] Servidor escuchando en el puerto ${entorno.puerto}`);
    console.log(`[EyBrek] API disponible en http://localhost:${entorno.puerto}/api`);
  });

  const apagar = async (senal) => {
    console.log(`\n[EyBrek] Cerrando (${senal})...`);
    servidor.close(async () => {
      await db.cerrar();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => apagar('SIGINT'));
  process.on('SIGTERM', () => apagar('SIGTERM'));
}

iniciar();
