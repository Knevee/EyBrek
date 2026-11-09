'use strict';

/**
 * Puente seguro entre el proceso principal y las ventanas.
 * El renderer no tiene acceso a Node: solo a las operaciones expuestas aqui.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('eybrek', {
  // ---- Acceso y sesion ---------------------------------------------
  registrar: (datos) => ipcRenderer.invoke('acceso:registrar', datos),
  iniciarSesion: (datos) => ipcRenderer.invoke('acceso:iniciar-sesion', datos),
  cerrarSesion: () => ipcRenderer.invoke('acceso:cerrar-sesion'),

  // ---- Configuracion ------------------------------------------------
  obtenerConfiguracion: () => ipcRenderer.invoke('configuracion:obtener'),
  guardarConfiguracion: (configuracion) =>
    ipcRenderer.invoke('configuracion:guardar', configuracion),

  // ---- Estado -------------------------------------------------------
  estadoServidor: () => ipcRenderer.invoke('estado:servidor'),
  estadoSesion: () => ipcRenderer.invoke('estado:sesion'),

  // ---- Ajustes locales de la pantalla --------------------------------
  ajustesGuardar: (clave, valor) => ipcRenderer.invoke('ajustes:guardar', clave, valor),
  ajustesLeer: (clave) => ipcRenderer.invoke('ajustes:leer', clave),

  // ---- Pantalla de descanso -----------------------------------------
  // La ventana de bloqueo usa su propio preload (preload-bloqueo.js).
  probarBloqueo: () => ipcRenderer.invoke('bloqueo:probar'),
  proximoDescanso: () => ipcRenderer.invoke('temporizador:proximo'),

  // ---- Eventos del proceso principal ---------------------------------
  onEstadoCambio: (callback) => {
    ipcRenderer.on('estado:cambio', (_evento, datos) => callback(datos));
  },
});
