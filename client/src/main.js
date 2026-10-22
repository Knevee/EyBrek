'use strict';

/**
 * Proceso principal de EyBrek.
 * Ensambla los modulos del cliente: interfaz, temporizador, bloqueo
 * de pantalla y comunicacion con copia local.
 */

const { app, BrowserWindow, Menu, Tray, ipcMain, nativeImage, shell } = require('electron');
const path = require('path');

const comunicacion = require('./modulos/comunicacion/comunicacion');
const copiaLocal = require('./modulos/comunicacion/copia-local');
const registro = require('./modulos/comunicacion/registro');
const Temporizador = require('./modulos/temporizador/temporizador');
const bloqueo = require('./modulos/bloqueo/bloqueo');
const notificaciones = require('./modulos/interfaz/notificaciones');
const validacion = require('./compartido/validacion-configuracion');

let ventanaPrincipal = null;
let bandeja = null;

const temporizador = new Temporizador();

let usuario = null;
let configuracionActual = null;

// =====================================================================
// Ventana principal
// =====================================================================

function crearVentanaPrincipal() {
  ventanaPrincipal = new BrowserWindow({
    width: 1120,
    height: 760,
    minWidth: 880,
    minHeight: 620,
    show: false,
    backgroundColor: '#f7f2e6',
    title: 'EyBrek',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  ventanaPrincipal.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  ventanaPrincipal.once('ready-to-show', () => ventanaPrincipal.show());

  // Utilidad de apoyo: EYBREK_CAPTURA=ruta.png guarda una imagen de la
  // ventana principal. Se usa para documentar las pantallas del proyecto.
  if (process.env.EYBREK_CAPTURA) {
    ventanaPrincipal.once('ready-to-show', async () => {
      await new Promise((resolver) => setTimeout(resolver, 2500));
      try {
        const imagen = await ventanaPrincipal.webContents.capturePage();
        require('fs').writeFileSync(process.env.EYBREK_CAPTURA, imagen.toPNG());
        registro.escribir(`Captura guardada en ${process.env.EYBREK_CAPTURA}`);
      } catch (error) {
        registro.escribir(`No se pudo capturar la ventana: ${error.message}`);
      }
    });
  }

  ventanaPrincipal.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Si hay sesion iniciada, la app sigue corriendo en segundo plano
  // para poder cumplir con el bloqueo periodico.
  ventanaPrincipal.on('close', (evento) => {
    if (usuario && !app.isQuitting) {
      evento.preventDefault();
      ventanaPrincipal.hide();
      notificaciones.mostrarAviso(
        'EyBrek sigue activo en segundo plano. Vuelve a abrirlo para ver la configuracion.',
        'EyBrek'
      );
    }
  });
}

// =====================================================================
// Bandeja del sistema
// =====================================================================

function crearBandeja() {
  try {
    const icono = nativeImage
      .createFromPath(path.join(__dirname, '..', 'assets', 'gato-mimido.png'))
      .resize({ width: 16, height: 16 });

    bandeja = new Tray(icono);
    bandeja.setToolTip('EyBrek - Tus ojos tambien necesitan un descanso');
    bandeja.setContextMenu(
      Menu.buildFromTemplate([
        { label: 'Abrir EyBrek', click: () => mostrarVentanaPrincipal() },
        { type: 'separator' },
        {
          label: 'Cerrar sesion',
          click: async () => {
            await cerrarSesion();
            mostrarVentanaPrincipal();
          },
        },
        { type: 'separator' },
        {
          label: 'Salir',
          click: () => {
            app.isQuitting = true;
            app.quit();
          },
        },
      ])
    );
    bandeja.on('click', () => mostrarVentanaPrincipal());
  } catch (error) {
    console.error('[bandeja] No se pudo crear:', error.message);
  }
}

function mostrarVentanaPrincipal() {
  if (!ventanaPrincipal) return;
  if (ventanaPrincipal.isMinimized()) ventanaPrincipal.restore();
  ventanaPrincipal.show();
  ventanaPrincipal.focus();
}

// =====================================================================
// Estado
// =====================================================================

function notificarEstado(vista, extra = {}) {
  if (!ventanaPrincipal || ventanaPrincipal.isDestroyed()) return;
  ventanaPrincipal.webContents.send('estado:cambio', {
    vista,
    usuario,
    configuracion: configuracionActual,
    ...extra,
  });
}

// =====================================================================
// Sesion
// =====================================================================

async function iniciarSesionGuardada() {
  const guardada = copiaLocal.leerSesion();

  if (!guardada || !guardada.token) {
    registro.escribir('Sin sesion guardada: se muestra la pantalla de acceso.');
    notificarEstado('acceso');
    return;
  }

  comunicacion.fijarToken(guardada.token);

  try {
    await comunicacion.verificarSesion();

    const respuesta = await comunicacion.obtenerConfiguracion();
    configuracionActual = respuesta.datos.configuracion;
    copiaLocal.guardarConfiguracion(configuracionActual);

    usuario = guardada.usuario;
    temporizador.iniciar(configuracionActual);

    registro.escribir(`Sesion restaurada para ${usuario.correo}.`);
    notificarEstado('configuracion');

    // Si hubo cambios guardados mientras no habia servidor, se suben
    // solos y en silencio.
    await subirCambiosPendientes();
  } catch (error) {
    if (error.sinConexion) {
      // RNF-05: con el servidor caido se sigue con la copia local.
      const local = copiaLocal.leerConfiguracion();
      if (local) {
        configuracionActual = local;
        usuario = guardada.usuario;
        temporizador.iniciar(local);
        registro.escribir('Servidor no disponible: se usa la copia local de la configuracion.');
        notificarEstado('configuracion');
        return;
      }
    }

    registro.escribir(`Sesion no valida: ${error.message}`);
    copiaLocal.borrarSesion();
    comunicacion.fijarToken(null);
    notificarEstado('acceso');
  }
}

/** Sube al servidor los cambios que quedaron pendientes, sin avisar. */
async function subirCambiosPendientes() {
  try {
    const subidos = await comunicacion.sincronizarCambiosPendientes();
    if (subidos) {
      registro.escribir('Cambios guardados sin conexion subidos al servidor.');
      const respuesta = await comunicacion.obtenerConfiguracion();
      configuracionActual = respuesta.datos.configuracion;
      temporizador.actualizarConfiguracion(configuracionActual);
      notificarEstado('configuracion');
    }
  } catch (error) {
    // Se volvera a intentar mas adelante. No se avisa al usuario.
  }
}

async function cerrarSesion() {
  try {
    await comunicacion.cerrarSesion();
  } catch (error) {
    // Si el servidor no responde, la sesion local se cierra igual.
  }

  copiaLocal.borrarSesion();
  comunicacion.fijarToken(null);
  temporizador.detener();
  usuario = null;
  configuracionActual = null;

  notificarEstado('acceso');
}

// =====================================================================
// Observador del Temporizador
// =====================================================================

function conectarEventosDelTemporizador() {
  // RF-17: aviso un minuto antes del bloqueo.
  temporizador.on('avisoProximo', () => {
    if (!configuracionActual || !configuracionActual.notificaciones_activas) return;

    notificaciones.mostrarAviso(
      'Tu vista necesita un descanso. El bloqueo empieza en 1 minuto.',
      'EyBrek - Proximo descanso'
    );
  });

  // RF-16: se cumplio el intervalo, se bloquea la pantalla.
  temporizador.on('bloquear', ejecutarBloqueo);
}

/**
 * Bloquea la pantalla mostrando el ejercicio de la rotacion.
 * La usa el Temporizador cuando se cumple el intervalo y tambien el
 * boton de prueba de la pantalla de configuracion.
 */
async function ejecutarBloqueo() {
  if (!usuario || !configuracionActual) return;

  const duracion = configuracionActual.duracion_minutos;
  let ejercicio = null;
  let catalogo = [];

  try {
    const respuesta = await comunicacion.obtenerSiguienteEjercicio();
    ejercicio = respuesta.datos.ejercicio;
    copiaLocal.guardarUltimoEjercicio(ejercicio);
  } catch (error) {
    // Sin servidor se muestra el ultimo ejercicio conocido.
    ejercicio = copiaLocal.leerUltimoEjercicio();
  }

  try {
    const respuesta = await comunicacion.obtenerCatalogo();
    catalogo = respuesta.datos.ejercicios;
  } catch (error) {
    catalogo = [];
  }

  registro.escribir(`Bloqueando la pantalla por ${duracion} minutos.`);

  bloqueo.bloquear({
    duracionMinutos: duracion,
    ejercicio,
    catalogo,
    // RF-23: al desbloquear se reinicia el conteo del intervalo.
    alTerminar: () => {
      temporizador.reiniciar();
      registro.escribir('Bloqueo terminado: se reinicia el conteo del intervalo.');
      notificarEstado('configuracion');
    },
  });
}

// =====================================================================
// IPC: lo que la interfaz puede pedir
// =====================================================================

function registrarIpc() {
  ipcMain.handle('acceso:registrar', async (_evento, datos) => {
    try {
      const respuesta = await comunicacion.registrar(
        datos.nombre,
        datos.correo,
        datos.contrasena
      );
      return { ok: true, mensaje: respuesta.mensaje };
    } catch (error) {
      return { ok: false, mensaje: error.message };
    }
  });

  ipcMain.handle('acceso:iniciar-sesion', async (_evento, datos) => {
    try {
      const respuesta = await comunicacion.iniciarSesion(datos.correo, datos.contrasena);
      const { token, usuario: usuarioSesion, configuracion } = respuesta.datos;

      copiaLocal.guardarSesion({ token, usuario: usuarioSesion });
      comunicacion.fijarToken(token);

      usuario = usuarioSesion;
      configuracionActual = configuracion || configuracionActual;
      if (configuracion) copiaLocal.guardarConfiguracion(configuracion);

      temporizador.iniciar(configuracionActual);
      notificarEstado('configuracion');

      return { ok: true, mensaje: 'Sesion iniciada.' };
    } catch (error) {
      return { ok: false, mensaje: error.message };
    }
  });

  ipcMain.handle('acceso:cerrar-sesion', async () => {
    await cerrarSesion();
    return { ok: true, mensaje: 'Sesion cerrada.' };
  });

  ipcMain.handle('configuracion:obtener', async () => {
    try {
      const respuesta = await comunicacion.obtenerConfiguracion();
      configuracionActual = respuesta.datos.configuracion;
      copiaLocal.guardarConfiguracion(configuracionActual);
      temporizador.actualizarConfiguracion(configuracionActual);
      return { ok: true, configuracion: configuracionActual };
    } catch (error) {
      const local = copiaLocal.leerConfiguracion();
      if (local) {
        configuracionActual = local;
        temporizador.actualizarConfiguracion(local);
        return { ok: true, configuracion: local };
      }
      return { ok: false, mensaje: error.message };
    }
  });

  ipcMain.handle('configuracion:guardar', async (_evento, configuracion) => {
    const { errores, valores } = validacion.validarConfiguracion(configuracion);

    if (errores.length > 0) {
      return { ok: false, mensaje: errores[0] };
    }

    try {
      const respuesta = await comunicacion.guardarConfiguracion(valores);
      configuracionActual = respuesta.datos.configuracion;
      copiaLocal.guardarConfiguracion(configuracionActual);
      temporizador.actualizarConfiguracion(configuracionActual);

      return {
        ok: true,
        mensaje: 'Configuracion guardada.',
        configuracion: configuracionActual,
      };
    } catch (error) {
      if (error.sinConexion) {
        // RNF-05: se guarda la copia local para seguir bloqueando.
        // El cambio se sube solo cuando el servidor vuelve a estar
        // disponible (sin avisar al usuario).
        configuracionActual = valores;
        copiaLocal.guardarConfiguracion({ ...valores, cambio_pendiente: true });
        temporizador.actualizarConfiguracion(valores);

        return {
          ok: true,
          mensaje: 'Configuracion guardada.',
          configuracion: valores,
        };
      }
      return { ok: false, mensaje: error.message };
    }
  });

  ipcMain.handle('estado:servidor', async () => {
    const estado = await comunicacion.verificarServidor();
    return estado;
  });

  ipcMain.handle('ajustes:guardar', async (_evento, clave, valor) => {
    copiaLocal.guardarAjuste(clave, valor);
    return { ok: true };
  });

  ipcMain.handle('ajustes:leer', async (_evento, clave) => {
    return copiaLocal.leerAjuste(clave, null);
  });

  ipcMain.handle('estado:sesion', async () => {
    return {
      vista: usuario ? 'configuracion' : 'acceso',
      usuario,
      configuracion: configuracionActual,
    };
  });

  // ---- Ventana de bloqueo -------------------------------------------
  ipcMain.handle('bloqueo:datos', async () => {
    const datos = bloqueo.leerDatos() || {};
    return {
      ...datos,
      ahora: new Date().toISOString(),
      consejos: Boolean(copiaLocal.leerAjuste('consejos', true)),
    };
  });

  ipcMain.on('bloqueo:terminado', () => {
    bloqueo.terminar();
  });

  // Boton de prueba: muestra la pantalla de descanso sin esperar el intervalo.
  ipcMain.handle('bloqueo:probar', async () => {
    if (!usuario || !configuracionActual) {
      return { ok: false, mensaje: 'Inicia sesion para probar el bloqueo.' };
    }
    await ejecutarBloqueo();
    return { ok: true };
  });
}

// =====================================================================
// Arranque
// =====================================================================

const instanciaUnica = app.requestSingleInstanceLock();

if (!instanciaUnica) {
  app.quit();
} else {
  app.on('second-instance', () => mostrarVentanaPrincipal());

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    crearVentanaPrincipal();
    crearBandeja();
    registrarIpc();
    conectarEventosDelTemporizador();
    iniciarSesionGuardada();
  });

  app.on('window-all-closed', () => {
    if (!usuario) app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) crearVentanaPrincipal();
  });

  app.on('before-quit', () => {
    app.isQuitting = true;
  });
}
