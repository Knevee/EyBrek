'use strict';

/**
 * Proceso principal de EyBrek.
 * Ensambla los modulos del cliente: interfaz, temporizador, bloqueo
 * de pantalla y comunicacion con copia local.
 */

const {
  app,
  BrowserWindow,
  Menu,
  Tray,
  ipcMain,
  nativeImage,
  powerMonitor,
  shell,
} = require('electron');
const path = require('path');

const comunicacion = require('./modulos/comunicacion/comunicacion');
const copiaLocal = require('./modulos/comunicacion/copia-local');
const registro = require('./modulos/comunicacion/registro');
const Temporizador = require('./modulos/temporizador/temporizador');
const bloqueo = require('./modulos/bloqueo/bloqueo');
const vigilante = require('./modulos/bloqueo/vigilante');
const notificaciones = require('./modulos/interfaz/notificaciones');
const validacion = require('./compartido/validacion-configuracion');

let ventanaPrincipal = null;
let bandeja = null;

// El temporizador consulta cuanto lleva el equipo sin uso: si la persona
// ya estuvo lejos del computador, eso cuenta como descanso.
const temporizador = new Temporizador({
  obtenerInactividadSegundos: () => powerMonitor.getSystemIdleTime(),
});

let usuario = null;
let configuracionActual = null;

// Al arrancar con Windows la app empieza oculta en la bandeja.
const iniciarOculto = process.argv.includes('--oculto');

// Momento en que el equipo se suspendio o se bloqueo la sesion de Windows.
let inicioAusencia = null;

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
  ventanaPrincipal.once('ready-to-show', () => {
    if (!iniciarOculto) ventanaPrincipal.show();
  });

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
    actualizarBandeja();
    bandeja.on('click', () => mostrarVentanaPrincipal());
  } catch (error) {
    console.error('[bandeja] No se pudo crear:', error.message);
  }
}

/**
 * Durante el descanso, o en el minuto previo, no se puede cerrar sesion
 * ni salir: seria una forma de omitir el bloqueo (RF-18).
 */
function descansoProtegido() {
  return bloqueo.estaBloqueado() || temporizador.descansoInminente();
}

/** Rehace el menu de la bandeja segun el estado actual. */
function actualizarBandeja() {
  if (!bandeja) return;

  const protegido = descansoProtegido();

  bandeja.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Abrir EyBrek', click: () => mostrarVentanaPrincipal() },
      { type: 'separator' },
      {
        label: 'Cerrar sesion',
        enabled: Boolean(usuario) && !protegido,
        click: async () => {
          if (descansoProtegido()) return;
          await cerrarSesion();
          mostrarVentanaPrincipal();
        },
      },
      { type: 'separator' },
      {
        label: protegido ? 'Salir (disponible despues del descanso)' : 'Salir',
        enabled: !protegido,
        click: () => {
          if (descansoProtegido()) return;
          app.isQuitting = true;
          app.quit();
        },
      },
    ])
  );
}

// =====================================================================
// Inicio con Windows
// =====================================================================

/**
 * Registra EyBrek para que arranque al iniciar sesion en Windows.
 * Sin esto, si la persona no abre la app, nunca hay descansos.
 */
function configurarInicioConWindows() {
  if (process.platform !== 'win32') return;

  const activo = copiaLocal.leerAjuste('iniciarConWindows', true);

  // Windows guarda el comando como texto: las rutas con espacios (por
  // ejemplo "Software Proct") deben ir entre comillas o el comando se parte.
  const comillas = (texto) => (/\s/.test(texto) ? `"${texto}"` : texto);

  // En desarrollo se ejecuta electron.exe con la carpeta del proyecto.
  const argumentos = app.isPackaged
    ? ['--oculto']
    : [comillas(app.getAppPath()), '--oculto'];

  try {
    app.setLoginItemSettings({
      openAtLogin: Boolean(activo),
      name: 'EyBrek',
      path: comillas(process.execPath),
      args: argumentos,
    });
  } catch (error) {
    registro.escribir(`No se pudo configurar el inicio con Windows: ${error.message}`);
  }
}

// =====================================================================
// Suspension y bloqueo de la sesion de Windows
// =====================================================================

/**
 * Si el equipo estuvo suspendido o con la sesion bloqueada al menos lo
 * que dura un descanso, la persona ya descanso: se reinicia el conteo en
 * lugar de bloquear apenas vuelve.
 */
function registrarAusencia() {
  if (!inicioAusencia) inicioAusencia = Date.now();
}

function registrarRegreso() {
  if (!inicioAusencia) return;

  const ausenciaMs = Date.now() - inicioAusencia;
  inicioAusencia = null;

  if (!usuario || !configuracionActual || bloqueo.estaBloqueado()) return;

  if (ausenciaMs >= configuracionActual.duracion_minutos * 60 * 1000) {
    temporizador.reiniciar();
    registro.escribir(
      `Ausencia de ${Math.round(ausenciaMs / 60000)} min: cuenta como descanso, se reinicia el conteo.`
    );
    actualizarBandeja();
  }
}

function vigilarEnergia() {
  powerMonitor.on('suspend', registrarAusencia);
  powerMonitor.on('lock-screen', registrarAusencia);
  powerMonitor.on('resume', registrarRegreso);
  powerMonitor.on('unlock-screen', registrarRegreso);
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
    mostrarVentanaPrincipal();
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
    mostrarVentanaPrincipal();
  } finally {
    // Si se retomo un descanso al abrir, el conteo sigue en pausa.
    if (bloqueo.estaBloqueado()) temporizador.marcarBloqueoEnCurso(true);
    actualizarBandeja();
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
  actualizarBandeja();
}

// =====================================================================
// Observador del Temporizador
// =====================================================================

function conectarEventosDelTemporizador() {
  // RF-17: aviso un minuto antes del bloqueo.
  temporizador.on('avisoProximo', () => {
    // En el minuto previo ya no se puede salir ni cerrar sesion.
    actualizarBandeja();

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
  // Un descanso retomado tras reabrir EyBrek sigue en curso.
  if (bloqueo.estaBloqueado()) return;

  if (!usuario || !configuracionActual) {
    temporizador.reiniciar();
    return;
  }

  // El conteo se pausa mientras dura el descanso (tambien en la prueba).
  temporizador.marcarBloqueoEnCurso(true);

  const duracion = configuracionActual.duracion_minutos;
  let ejercicio = null;
  let catalogo = [];

  try {
    const respuesta = await comunicacion.obtenerCatalogo();
    catalogo = respuesta.datos.ejercicios;
    copiaLocal.guardarCatalogo(catalogo);
  } catch (error) {
    catalogo = copiaLocal.leerCatalogo() || [];
  }

  try {
    const respuesta = await comunicacion.obtenerSiguienteEjercicio();
    ejercicio = respuesta.datos.ejercicio;
  } catch (error) {
    // Sin servidor la rotacion sigue en el equipo con el catalogo guardado.
    ejercicio = siguienteEjercicioLocal(catalogo, copiaLocal.leerUltimoEjercicio());
  }
  copiaLocal.guardarUltimoEjercicio(ejercicio);

  registro.escribir(`Bloqueando la pantalla por ${duracion} minutos.`);
  mostrarBloqueo({ duracionMinutos: duracion, ejercicio, catalogo });
}

/**
 * Muestra el bloqueo, lo guarda en el equipo y arranca el vigilante,
 * para que el descanso siga aunque EyBrek se cierre a la fuerza.
 */
function mostrarBloqueo(opciones) {
  bloqueo.bloquear({
    ...opciones,
    // RF-23: al desbloquear se reinicia el conteo del intervalo.
    alTerminar: () => {
      copiaLocal.borrarBloqueoEnCurso();
      vigilante.detener();
      temporizador.reiniciar();
      registro.escribir('Bloqueo terminado: se reinicia el conteo del intervalo.');
      notificarEstado('configuracion');
      actualizarBandeja();
    },
  });

  copiaLocal.guardarBloqueoEnCurso(bloqueo.leerDatos());
  vigilante.iniciar(copiaLocal.rutaBloqueoEnCurso());
  actualizarBandeja();
}

/**
 * Si EyBrek se cerro (o se apago el equipo) a mitad de un descanso,
 * lo retoma con el tiempo que faltaba. Devuelve true si lo retomo.
 */
function reanudarBloqueoPendiente() {
  const pendiente = copiaLocal.leerBloqueoEnCurso();
  if (!pendiente || !pendiente.horaFin) return false;

  const restanteMs = new Date(pendiente.horaFin).getTime() - Date.now();
  // Un descanso dura como mucho 30 minutos: un archivo con mas tiempo
  // no es valido y se descarta.
  if (restanteMs <= 0 || restanteMs > 31 * 60 * 1000) {
    copiaLocal.borrarBloqueoEnCurso();
    return false;
  }

  registro.escribir('EyBrek se cerro durante un descanso: se retoma el bloqueo.');
  temporizador.marcarBloqueoEnCurso(true);
  mostrarBloqueo({
    duracionMinutos: pendiente.duracionMinutos,
    ejercicio: pendiente.ejercicio,
    catalogo: pendiente.catalogo,
    horaInicio: pendiente.horaInicio,
    horaFin: pendiente.horaFin,
  });
  return true;
}

/**
 * Elige el siguiente ejercicio sin servidor (RNF-05, RF-21): el que sigue
 * al ultimo mostrado en el catalogo guardado, volviendo al primero.
 */
function siguienteEjercicioLocal(catalogo, ultimo) {
  if (!catalogo || catalogo.length === 0) return ultimo || null;

  const posicion = ultimo
    ? catalogo.findIndex((ejercicio) => ejercicio.id_ejercicio === ultimo.id_ejercicio)
    : -1;
  const indice = posicion >= 0 ? (posicion + 1) % catalogo.length : 0;

  return { ...catalogo[indice], posicion: indice + 1, total: catalogo.length };
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
      actualizarBandeja();

      return { ok: true, mensaje: 'Sesion iniciada.' };
    } catch (error) {
      return { ok: false, mensaje: error.message };
    }
  });

  ipcMain.handle('acceso:cerrar-sesion', async () => {
    if (descansoProtegido()) {
      return {
        ok: false,
        mensaje: bloqueo.estaBloqueado()
          ? 'Estás en un descanso. Podrás cerrar sesión cuando termine.'
          : 'El descanso empieza en menos de un minuto. Podrás cerrar sesión después.',
      };
    }
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

  // La ventana avisa que su cuenta llego a cero; el proceso principal
  // solo desbloquea si de verdad se cumplio la duracion.
  ipcMain.on('bloqueo:terminado', () => {
    bloqueo.solicitarFin();
  });

  // Para mostrar en la configuracion cuando sera el proximo descanso.
  ipcMain.handle('temporizador:proximo', async () => {
    const proximo = temporizador.proximoBloqueo;
    return {
      activo: Boolean(usuario && configuracionActual && configuracionActual.bloqueo_activo),
      proximo: proximo ? proximo.toISOString() : null,
    };
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
    vigilarEnergia();
    configurarInicioConWindows();
    reanudarBloqueoPendiente();
    iniciarSesionGuardada();
  });

  app.on('window-all-closed', () => {
    if (!usuario) app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) crearVentanaPrincipal();
  });

  // Durante el descanso la app no se puede cerrar (RF-18). Windows no
  // emite este evento al apagar o reiniciar el equipo, asi que no lo impide.
  app.on('before-quit', (evento) => {
    if (bloqueo.estaBloqueado()) {
      evento.preventDefault();
      return;
    }
    app.isQuitting = true;
  });
}
