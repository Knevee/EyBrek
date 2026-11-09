'use strict';

/**
 * Puente de la ventana de bloqueo.
 * Solo expone lo que la pantalla de descanso necesita: leer sus datos y
 * avisar que la cuenta regresiva llego a cero. El proceso principal
 * decide si de verdad termino.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('eybrek', {
  datosBloqueo: () => ipcRenderer.invoke('bloqueo:datos'),
  terminarBloqueo: () => ipcRenderer.send('bloqueo:terminado'),
});
