/**
 * EyBrek - Captura de pantalla del cliente
 * Usa el puerto de depuracion de Electron (--remote-debugging-port=9222)
 * para capturar la ventana principal tal como se ve.
 *
 * Uso: node capturar.js [archivo.png]
 */

const http = require('http');
const fs = require('fs');

const PUERTO = 9222;
const salida = process.argv[2] || 'captura.png';

function objetivos() {
  return new Promise((resolver, rechazar) => {
    http
      .get(`http://127.0.0.1:${PUERTO}/json`, (respuesta) => {
        let datos = '';
        respuesta.on('data', (trozo) => (datos += trozo));
        respuesta.on('end', () => resolver(JSON.parse(datos)));
      })
      .on('error', rechazar);
  });
}

(async () => {
  const lista = await objetivos();
  const pagina = lista.find((item) => item.type === 'page' && item.url.includes('index.html'));

  if (!pagina) {
    console.log('No se encontro la ventana principal.');
    console.log(lista.map((item) => `${item.type} - ${item.url}`).join('\n'));
    process.exit(1);
  }

  const socket = new WebSocket(pagina.webSocketDebuggerUrl);
  let id = 0;
  const pendientes = new Map();

  socket.addEventListener('message', (evento) => {
    const mensaje = JSON.parse(evento.data);
    if (mensaje.id && pendientes.has(mensaje.id)) {
      pendientes.get(mensaje.id)(mensaje);
      pendientes.delete(mensaje.id);
    }
  });

  const enviar = (metodo, parametros = {}) =>
    new Promise((resolver) => {
      id += 1;
      const temporizador = setTimeout(() => {
        pendientes.delete(id);
        resolver({ error: { message: `Tiempo agotado en ${metodo}` } });
      }, 15000);
      pendientes.set(id, (mensaje) => {
        clearTimeout(temporizador);
        resolver(mensaje);
      });
      socket.send(JSON.stringify({ id, method: metodo, params: parametros }));
    });

  await new Promise((resolver) => socket.addEventListener('open', resolver));

  await enviar('Page.enable');
  const captura = await enviar('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false,
  });

  if (captura.error) {
    console.log('Error al capturar:', JSON.stringify(captura.error));
    process.exit(1);
  }

  const base64 = captura.result && captura.result.data;
  if (!base64) {
    console.log('No se pudo capturar la pantalla.');
    process.exit(1);
  }

  fs.writeFileSync(salida, Buffer.from(base64, 'base64'));
  console.log(`Captura guardada en ${salida}`);

  socket.close();
  process.exit(0);
})();
