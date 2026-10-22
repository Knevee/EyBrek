/**
 * EyBrek - Utilidad de diagnostico
 * Se conecta al puerto de depuracion de Electron y evalua una expresion
 * JavaScript en la ventana principal.
 *
 * Uso: node diagnosticar.js "expresion"
 */

const http = require('http');

const expresion = process.argv[2] || '1';
const PUERTO = 9222;

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

  const enviar = (metodo, parametros) =>
    new Promise((resolver) => {
      id += 1;
      pendientes.set(id, resolver);
      socket.send(JSON.stringify({ id, method: metodo, params: parametros }));
    });

  await new Promise((resolver) => socket.addEventListener('open', resolver));

  const resultado = await enviar('Runtime.evaluate', {
    expression: expresion,
    returnByValue: true,
    awaitPromise: true,
  });

  const valor = resultado.result && resultado.result.result;
  console.log(
    typeof valor && valor && 'value' in valor ? valor.value : JSON.stringify(resultado, null, 2)
  );

  socket.close();
  process.exit(0);
})();
