'use strict';

/**
 * EyBrek - Pruebas automaticas de la API del servidor
 *
 * Ejecutar con:  npm run pruebas
 *
 * Las pruebas usan la base de datos real (base `eybrek`). Cada corrida
 * crea un usuario de prueba que se elimina al terminar.
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const crearAplicacion = require('../src/app');
const db = require('../src/db/conexion');
const usuarios = require('../src/modulos/acceso-a-datos/usuarios');

const app = crearAplicacion();

const CONTRASENA = 'clave12345';
let correo = '';
let token = '';

function aleatorio() {
  return Math.random().toString(36).slice(2, 10);
}

function cabeceraSesion() {
  return { Authorization: `Bearer ${token}` };
}

describe('API de EyBrek', () => {
  before(async () => {
    // Se inicializa la base de datos igual que lo hace el servidor.
    await db.iniciar();

    correo = `prueba${aleatorio()}@eybrek.com`;

    const registro = await request(app)
      .post('/api/auth/registro')
      .send({ nombre: 'Usuario de Prueba', correo, contrasena: CONTRASENA })
      .expect(201);

    assert.equal(registro.body.ok, true);

    const login = await request(app)
      .post('/api/auth/iniciar-sesion')
      .send({ correo, contrasena: CONTRASENA })
      .expect(200);

    token = login.body.datos.token;
    assert.ok(token, 'El inicio de sesion debe devolver un token');
  });

  after(async () => {
    const usuario = await usuarios.leerPorCorreo(correo);
    if (usuario) await usuarios.eliminar(usuario.id_usuario);
    await db.cerrar();
  });

  // ---- Salud --------------------------------------------------------
  test('GET /api/salud responde que el servidor esta en linea', async () => {
    const respuesta = await request(app).get('/api/salud').expect(200);
    assert.equal(respuesta.body.ok, true);
  });

  // ---- Autenticacion ------------------------------------------------
  test('RF-01: registra una cuenta nueva', async () => {
    const nuevoCorreo = `nuevo${aleatorio()}@eybrek.com`;
    const respuesta = await request(app)
      .post('/api/auth/registro')
      .send({ nombre: 'Cuenta Nueva', correo: nuevoCorreo, contrasena: CONTRASENA })
      .expect(201);

    assert.equal(respuesta.body.ok, true);
    assert.equal(respuesta.body.datos.usuario.correo, nuevoCorreo);

    const usuario = await usuarios.leerPorCorreo(nuevoCorreo);
    await usuarios.eliminar(usuario.id_usuario);
  });

  test('RF-02: rechaza un correo ya registrado', async () => {
    const respuesta = await request(app)
      .post('/api/auth/registro')
      .send({ nombre: 'Repetido', correo, contrasena: CONTRASENA })
      .expect(400);

    assert.match(respuesta.body.error, /ya esta registrado/i);
  });

  test('RF-02: rechaza un correo con formato invalido', async () => {
    const respuesta = await request(app)
      .post('/api/auth/registro')
      .send({ nombre: 'Correo Malo', correo: 'esto-no-es-un-correo', contrasena: CONTRASENA })
      .expect(400);

    assert.match(respuesta.body.error, /formato/i);
  });

  test('RF-02: rechaza una contrasena demasiado corta', async () => {
    const respuesta = await request(app)
      .post('/api/auth/registro')
      .send({ nombre: 'Corto', correo: `corto${aleatorio()}@eybrek.com`, contrasena: '123' })
      .expect(400);

    assert.match(respuesta.body.error, /contrasena/i);
  });

  test('RF-03: inicia sesion con correo y contrasena correctos', async () => {
    const respuesta = await request(app)
      .post('/api/auth/iniciar-sesion')
      .send({ correo, contrasena: CONTRASENA })
      .expect(200);

    assert.ok(respuesta.body.datos.token);
    assert.equal(respuesta.body.datos.usuario.correo, correo);
  });

  test('RF-03: rechaza una contrasena incorrecta', async () => {
    const respuesta = await request(app)
      .post('/api/auth/iniciar-sesion')
      .send({ correo, contrasena: 'incorrecta' })
      .expect(401);

    assert.match(respuesta.body.error, /incorrectos/i);
  });

  test('RNF-02: la contrasena se guarda cifrada, no en texto plano', async () => {
    const usuario = await usuarios.leerPorCorreo(correo);
    assert.notEqual(usuario.contrasena_hash, CONTRASENA);
    assert.ok(usuario.contrasena_hash.startsWith('$2'), 'Debe ser un hash bcrypt');
  });

  test('RF-24: rechaza una peticion sin token', async () => {
    const respuesta = await request(app).get('/api/configuracion').expect(401);
    assert.match(respuesta.body.error, /sesion/i);
  });

  test('RF-24: rechaza un token inventado', async () => {
    const respuesta = await request(app)
      .get('/api/configuracion')
      .set('Authorization', 'Bearer token-inventado')
      .expect(401);

    assert.match(respuesta.body.error, /sesion/i);
  });

  // ---- Configuracion ------------------------------------------------
  test('RF-12: la cuenta nueva recibe la configuracion por defecto', async () => {
    const respuesta = await request(app)
      .get('/api/configuracion')
      .set(cabeceraSesion())
      .expect(200);

    const configuracion = respuesta.body.datos.configuracion;
    assert.equal(configuracion.bloqueo_activo, true);
    assert.equal(configuracion.intervalo_minutos, 120);
    assert.equal(configuracion.duracion_minutos, 15);
    assert.equal(configuracion.hora_inicio, '08:00');
    assert.equal(configuracion.hora_fin, '21:00');
    assert.equal(configuracion.notificaciones_activas, true);
  });

  test('RF-10 y RF-13: guarda la configuracion y la conserva en el servidor', async () => {
    const guardado = await request(app)
      .put('/api/configuracion')
      .set(cabeceraSesion())
      .send({
        bloqueo_activo: true,
        intervalo_minutos: 30,
        duracion_minutos: 5,
        hora_inicio: '09:00',
        hora_fin: '18:00',
        notificaciones_activas: false,
      })
      .expect(200);

    assert.equal(guardado.body.datos.configuracion.intervalo_minutos, 30);

    const lectura = await request(app)
      .get('/api/configuracion')
      .set(cabeceraSesion())
      .expect(200);

    assert.equal(lectura.body.datos.configuracion.duracion_minutos, 5);
    assert.equal(lectura.body.datos.configuracion.hora_fin, '18:00');
    assert.equal(lectura.body.datos.configuracion.notificaciones_activas, false);
  });

  test('RF-11: rechaza un intervalo menor a 15 minutos', async () => {
    const respuesta = await request(app)
      .put('/api/configuracion')
      .set(cabeceraSesion())
      .send({
        bloqueo_activo: true,
        intervalo_minutos: 5,
        duracion_minutos: 5,
        hora_inicio: '08:00',
        hora_fin: '21:00',
        notificaciones_activas: true,
      })
      .expect(400);

    assert.match(respuesta.body.error, /15 minutos y 8 horas/);
  });

  test('RF-11: rechaza un intervalo mayor a 8 horas', async () => {
    const respuesta = await request(app)
      .put('/api/configuracion')
      .set(cabeceraSesion())
      .send({
        bloqueo_activo: true,
        intervalo_minutos: 600,
        duracion_minutos: 5,
        hora_inicio: '08:00',
        hora_fin: '21:00',
        notificaciones_activas: true,
      })
      .expect(400);

    assert.match(respuesta.body.error, /15 minutos y 8 horas/);
  });

  test('RF-11: rechaza una duracion mayor a 30 minutos', async () => {
    const respuesta = await request(app)
      .put('/api/configuracion')
      .set(cabeceraSesion())
      .send({
        bloqueo_activo: true,
        intervalo_minutos: 120,
        duracion_minutos: 45,
        hora_inicio: '08:00',
        hora_fin: '21:00',
        notificaciones_activas: true,
      })
      .expect(400);

    assert.match(respuesta.body.error, /1 y 30 minutos/);
  });

  test('RF-11: rechaza una duracion mayor o igual al intervalo', async () => {
    const respuesta = await request(app)
      .put('/api/configuracion')
      .set(cabeceraSesion())
      .send({
        bloqueo_activo: true,
        intervalo_minutos: 30,
        duracion_minutos: 30,
        hora_inicio: '08:00',
        hora_fin: '21:00',
        notificaciones_activas: true,
      })
      .expect(400);

    assert.match(respuesta.body.error, /menor que el intervalo/);
  });

  // ---- Ejercicios ---------------------------------------------------
  test('RNF-07: el catalogo de ejercicios esta guardado como datos', async () => {
    const respuesta = await request(app)
      .get('/api/ejercicios')
      .set(cabeceraSesion())
      .expect(200);

    const ejercicios = respuesta.body.datos.ejercicios;
    assert.ok(ejercicios.length >= 4, 'El catalogo debe tener al menos 4 ejercicios');
    assert.ok(ejercicios[0].titulo);
    assert.ok(ejercicios[0].instrucciones);
  });

  test('RF-21: la rotacion avanza un ejercicio por consulta y vuelve al primero', async () => {
    const catalogo = await request(app)
      .get('/api/ejercicios')
      .set(cabeceraSesion())
      .expect(200);

    const total = catalogo.body.datos.ejercicios.length;
    const vistos = [];

    for (let i = 0; i < total; i += 1) {
      const siguiente = await request(app)
        .get('/api/ejercicios/siguiente')
        .set(cabeceraSesion())
        .expect(200);
      vistos.push(siguiente.body.datos.ejercicio.titulo);
    }

    const repetido = await request(app)
      .get('/api/ejercicios/siguiente')
      .set(cabeceraSesion())
      .expect(200);

    assert.equal(repetido.body.datos.ejercicio.posicion, 1);
    assert.equal(vistos.length, total);
    assert.equal(new Set(vistos).size, total, 'Cada ejercicio debe mostrarse una vez por ciclo');
  });

  // ---- Cierre de sesion ---------------------------------------------
  test('RF-04: cierra la sesion y el token deja de servir', async () => {
    const sesionTemporal = await request(app)
      .post('/api/auth/iniciar-sesion')
      .send({ correo, contrasena: CONTRASENA })
      .expect(200);

    const tokenTemporal = sesionTemporal.body.datos.token;

    await request(app)
      .post('/api/auth/cerrar-sesion')
      .set('Authorization', `Bearer ${tokenTemporal}`)
      .expect(200);

    await request(app)
      .get('/api/configuracion')
      .set('Authorization', `Bearer ${tokenTemporal}`)
      .expect(401);
  });
});
