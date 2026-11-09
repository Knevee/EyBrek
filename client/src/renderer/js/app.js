'use strict';

/* =====================================================================
   EyBrek - Ventana principal
   Maneja las vistas de acceso (inicio de sesion y registro) y de
   configuracion.
   ===================================================================== */

const { validarConfiguracion } = window.EyBrekValidacion;

// ---- Elementos -------------------------------------------------------

const vistaAcceso = document.getElementById('vista-acceso');
const vistaConfiguracion = document.getElementById('vista-configuracion');

const formularioAcceso = document.getElementById('formulario-acceso');
const tituloAcceso = document.getElementById('titulo-acceso');
const subtituloAcceso = document.getElementById('subtitulo-acceso');
const campoNombre = document.getElementById('campo-nombre');
const campoNombreContenedor = document.getElementById('campo-nombre-contenedor');
const campoCorreo = document.getElementById('campo-correo');
const campoContrasena = document.getElementById('campo-contrasena');
const verContrasena = document.getElementById('ver-contrasena');
const botonAcceso = document.getElementById('boton-acceso');
const mensajeAcceso = document.getElementById('mensaje-acceso');
const alternarModo = document.getElementById('alternar-modo');
const textoAlternativo = document.getElementById('texto-alternativo');

const campoBloqueoActivo = document.getElementById('campo-bloqueo-activo');
const campoIntervalo = document.getElementById('campo-intervalo');
const campoDuracion = document.getElementById('campo-duracion');
const campoHoraInicio = document.getElementById('campo-hora-inicio');
const campoHoraFin = document.getElementById('campo-hora-fin');
const campoNotificaciones = document.getElementById('campo-notificaciones');
const campoConsejos = document.getElementById('campo-consejos');
const chipsDuracion = document.getElementById('chips-duracion');
const botonGuardar = document.getElementById('boton-guardar');
const botonProbar = document.getElementById('boton-probar');
const mensajeGuardado = document.getElementById('mensaje-guardado');
const botonCerrarSesion = document.getElementById('boton-cerrar-sesion');

const proximoDescanso = document.getElementById('proximo-descanso');
const proximoDescansoTexto = document.getElementById('proximo-descanso-texto');

const usuarioInicial = document.getElementById('usuario-inicial');
const usuarioNombre = document.getElementById('usuario-nombre');
const usuarioCorreo = document.getElementById('usuario-correo');

// ---- Estado -----------------------------------------------------------

let modoRegistro = false;

// =====================================================================
// Vistas
// =====================================================================

function mostrarVista(nombre) {
  vistaAcceso.hidden = nombre !== 'acceso';
  vistaConfiguracion.hidden = nombre !== 'configuracion';
}

function mostrarMensaje(texto, tipo) {
  if (!texto) {
    mensajeAcceso.hidden = true;
    return;
  }
  mensajeAcceso.hidden = false;
  mensajeAcceso.textContent = texto;
  mensajeAcceso.classList.toggle('mensaje-ok', tipo === 'ok');
}

function mostrarConfirmacion(texto) {
  if (!texto) {
    mensajeGuardado.hidden = true;
    return;
  }
  mensajeGuardado.hidden = false;
  mensajeGuardado.textContent = texto;
}

// =====================================================================
// Acceso: inicio de sesion y registro
// =====================================================================

function actualizarFormularioAcceso() {
  if (modoRegistro) {
    tituloAcceso.textContent = 'Crea tu cuenta';
    subtituloAcceso.textContent = 'Regístrate para empezar a cuidar tu vista.';
    botonAcceso.querySelector('span').textContent = 'Crear cuenta';
    campoNombreContenedor.hidden = false;
    campoContrasena.setAttribute('autocomplete', 'new-password');
    campoContrasena.placeholder = 'Contraseña (mínimo 8 caracteres)';
    textoAlternativo.textContent = '¿Ya tienes una cuenta?';
    alternarModo.textContent = 'Inicia sesión';
  } else {
    tituloAcceso.textContent = 'Bienvenido de vuelta';
    subtituloAcceso.textContent = 'Inicia sesión para cuidar tu vista.';
    botonAcceso.querySelector('span').textContent = 'Iniciar sesión';
    campoNombreContenedor.hidden = true;
    campoContrasena.setAttribute('autocomplete', 'current-password');
    campoContrasena.placeholder = 'Contraseña';
    textoAlternativo.textContent = '¿No tienes una cuenta?';
    alternarModo.textContent = 'Regístrate';
  }
  mostrarMensaje('');
}

alternarModo.addEventListener('click', () => {
  modoRegistro = !modoRegistro;
  actualizarFormularioAcceso();
});

// El ojo tachado indica que la contrasena esta oculta; al pulsarlo se muestra.
verContrasena.addEventListener('click', () => {
  const mostrar = campoContrasena.type === 'password';
  campoContrasena.type = mostrar ? 'text' : 'password';
  verContrasena.setAttribute('aria-pressed', String(mostrar));
  verContrasena.setAttribute('aria-label', mostrar ? 'Ocultar contraseña' : 'Mostrar contraseña');
  verContrasena.querySelector('use').setAttribute('href', mostrar ? '#i-ojo-simple' : '#i-ojo-tachado');
});

formularioAcceso.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  mostrarMensaje('');

  const correo = campoCorreo.value.trim();
  const contrasena = campoContrasena.value;
  const nombre = campoNombre.value.trim();

  if (!correo || !contrasena) {
    mostrarMensaje('Escribe tu correo y tu contraseña para continuar.');
    return;
  }

  botonAcceso.disabled = true;
  botonAcceso.querySelector('span').textContent = 'Un momento...';

  try {
    const respuesta = modoRegistro
      ? await window.eybrek.registrar({ nombre, correo, contrasena })
      : await window.eybrek.iniciarSesion({ correo, contrasena });

    if (!respuesta.ok) {
      mostrarMensaje(respuesta.mensaje);
      return;
    }

    if (modoRegistro) {
      // Tras registrarse se pide iniciar sesion.
      modoRegistro = false;
      actualizarFormularioAcceso();
      mostrarMensaje('¡Cuenta creada! Ya puedes iniciar sesión.', 'ok');
      campoContrasena.value = '';
    }
  } finally {
    botonAcceso.disabled = false;
    botonAcceso.querySelector('span').textContent = modoRegistro
      ? 'Crear cuenta'
      : 'Iniciar sesión';
  }
});

// =====================================================================
// Configuracion
// =====================================================================

function llenarConfiguracion(configuracion) {
  if (!configuracion) return;

  campoBloqueoActivo.checked = Boolean(configuracion.bloqueo_activo);
  campoIntervalo.value = String(configuracion.intervalo_minutos);
  campoDuracion.value = String(configuracion.duracion_minutos);
  campoHoraInicio.value = configuracion.hora_inicio || '08:00';
  campoHoraFin.value = configuracion.hora_fin || '21:00';
  campoNotificaciones.checked = Boolean(configuracion.notificaciones_activas);

  ajustarDuracion();
  marcarChipActivo();
}

/** Impide elegir una duracion mayor o igual al intervalo (RF-11). */
function ajustarDuracion() {
  const intervalo = Number(campoIntervalo.value);

  Array.from(campoDuracion.options).forEach((opcion) => {
    opcion.disabled = Number(opcion.value) >= intervalo;
  });

  if (Number(campoDuracion.value) >= intervalo) {
    const permitidas = Array.from(campoDuracion.options)
      .filter((opcion) => !opcion.disabled)
      .map((opcion) => Number(opcion.value));
    if (permitidas.length) {
      campoDuracion.value = String(Math.max.apply(null, permitidas));
    }
  }
}

function marcarChipActivo() {
  const duracion = Number(campoDuracion.value);
  chipsDuracion.querySelectorAll('.chip').forEach((chip) => {
    chip.classList.toggle('activo', Number(chip.dataset.minutos) === duracion);
  });
}

campoIntervalo.addEventListener('change', () => {
  ajustarDuracion();
  marcarChipActivo();
});

campoDuracion.addEventListener('change', marcarChipActivo);

chipsDuracion.addEventListener('click', (evento) => {
  const chip = evento.target.closest('.chip');
  if (!chip) return;
  campoDuracion.value = chip.dataset.minutos;
  marcarChipActivo();
});

// Toda la fila "Desde / Hasta" abre el selector de hora, no solo el texto.
[campoHoraInicio, campoHoraFin].forEach((campo) => {
  campo.closest('.fila-hora').addEventListener('click', () => {
    try { campo.showPicker(); } catch { campo.focus(); }
  });
});

/** "Ana Pérez" -> "AP"; un solo nombre -> su primera letra. */
function iniciales(nombre) {
  const partes = (nombre || '?').trim().split(/\s+/);
  const letras = partes.length > 1 ? partes[0][0] + partes[partes.length - 1][0] : partes[0][0];
  return letras.toUpperCase();
}

botonGuardar.addEventListener('click', async () => {
  mostrarConfirmacion('');

  const configuracion = {
    bloqueo_activo: campoBloqueoActivo.checked,
    intervalo_minutos: Number(campoIntervalo.value),
    duracion_minutos: Number(campoDuracion.value),
    hora_inicio: campoHoraInicio.value,
    hora_fin: campoHoraFin.value,
    notificaciones_activas: campoNotificaciones.checked,
  };

  // Validacion inmediata en pantalla (mensaje con el rango permitido).
  const { errores } = validarConfiguracion(configuracion);
  if (errores.length) {
    mostrarConfirmacion(errores[0]);
    mensajeGuardado.classList.remove('mensaje-ok');
    return;
  }

  botonGuardar.disabled = true;
  try {
    const respuesta = await window.eybrek.guardarConfiguracion(configuracion);

    if (!respuesta.ok) {
      mostrarConfirmacion(respuesta.mensaje);
      mensajeGuardado.classList.remove('mensaje-ok');
      return;
    }

    llenarConfiguracion(respuesta.configuracion);
    mostrarConfirmacion(respuesta.mensaje);
    mensajeGuardado.classList.add('mensaje-ok');
    pintarProximoDescanso();
  } finally {
    botonGuardar.disabled = false;
  }
});

botonCerrarSesion.addEventListener('click', async () => {
  botonCerrarSesion.disabled = true;
  try {
    const respuesta = await window.eybrek.cerrarSesion();
    if (!respuesta.ok) {
      mostrarConfirmacion(respuesta.mensaje);
      mensajeGuardado.classList.remove('mensaje-ok');
      return;
    }
    mostrarVista('acceso');
  } finally {
    botonCerrarSesion.disabled = false;
  }
});

// Muestra la pantalla de descanso sin esperar a que se cumpla el intervalo.
botonProbar.addEventListener('click', async () => {
  botonProbar.disabled = true;
  try {
    const respuesta = await window.eybrek.probarBloqueo();
    if (!respuesta.ok) {
      mostrarConfirmacion(respuesta.mensaje);
      mensajeGuardado.classList.remove('mensaje-ok');
    }
  } finally {
    botonProbar.disabled = false;
  }
});

// El aviso de consejos es una preferencia local de la pantalla.
campoConsejos.addEventListener('change', async () => {
  const valor = campoConsejos.checked;

  try {
    localStorage.setItem('eybrek-consejos', valor ? '1' : '0');
  } catch (error) {
    /* localStorage puede estar deshabilitado: no es critico */
  }

  await window.eybrek.ajustesGuardar('consejos', valor);
});

try {
  campoConsejos.checked = localStorage.getItem('eybrek-consejos') !== '0';
} catch (error) {
  campoConsejos.checked = true;
}

// =====================================================================
// Proximo descanso
// =====================================================================

/** Formatea una fecha como "4:15 p. m." */
function hora12(fecha) {
  const horas = fecha.getHours();
  const minutos = String(fecha.getMinutes()).padStart(2, '0');
  const sufijo = horas < 12 ? 'a. m.' : 'p. m.';
  return `${horas % 12 === 0 ? 12 : horas % 12}:${minutos} ${sufijo}`;
}

/** Muestra cuando sera el proximo descanso, para que no tome por sorpresa. */
async function pintarProximoDescanso() {
  const estado = await window.eybrek.proximoDescanso();

  if (!estado.activo) {
    proximoDescanso.hidden = false;
    proximoDescansoTexto.textContent = 'El bloqueo está desactivado.';
    return;
  }

  if (!estado.proximo) {
    proximoDescanso.hidden = false;
    proximoDescansoTexto.textContent = 'Fuera de tu horario: no habrá descansos hasta la hora de inicio.';
    return;
  }

  proximoDescanso.hidden = false;
  proximoDescansoTexto.textContent = `Próximo descanso a las ${hora12(new Date(estado.proximo))}`;
}

setInterval(() => {
  if (!vistaConfiguracion.hidden) pintarProximoDescanso();
}, 30000);

// =====================================================================
// Estado que envia el proceso principal
// =====================================================================

function aplicarEstado(datos) {
  if (!datos) return;

  if (datos.vista === 'configuracion') {
    if (datos.usuario) {
      usuarioNombre.textContent = datos.usuario.nombre;
      usuarioCorreo.textContent = datos.usuario.correo;
      usuarioInicial.textContent = iniciales(datos.usuario.nombre);
    }
    if (datos.configuracion) llenarConfiguracion(datos.configuracion);
    mostrarVista('configuracion');
    pintarProximoDescanso();
  } else {
    mostrarVista('acceso');
  }
}

window.eybrek.onEstadoCambio(aplicarEstado);

// Estado inicial
(async () => {
  const estado = await window.eybrek.estadoSesion();
  aplicarEstado(estado);
  if (estado.vista === 'configuracion') {
    const respuesta = await window.eybrek.obtenerConfiguracion();
    if (respuesta.ok) llenarConfiguracion(respuesta.configuracion);
  }
})();

actualizarFormularioAcceso();
