'use strict';

/**
 * Motor de base de datos: SQLite
 *
 * Motor por defecto. No necesita servidor, ni usuario, ni contrasena:
 * la base es un unico archivo (eybrek.db) que se crea solo al arrancar.
 * Se usa el modulo `node:sqlite`, que viene incluido en Node.js, por lo
 * que no hace falta instalar ni compilar nada.
 */

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { EJERCICIOS } = require('../catalogo-ejercicios');

const ESQUEMA = `
CREATE TABLE IF NOT EXISTS Usuario (
  id_usuario      INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre          TEXT    NOT NULL,
  correo          TEXT    NOT NULL UNIQUE,
  contrasena_hash TEXT    NOT NULL,
  fecha_creacion  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS Sesion (
  id_sesion    INTEGER PRIMARY KEY AUTOINCREMENT,
  id_usuario   INTEGER NOT NULL REFERENCES Usuario (id_usuario) ON DELETE CASCADE,
  token        TEXT    NOT NULL UNIQUE,
  fecha_inicio TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS Configuracion (
  id_configuracion       INTEGER PRIMARY KEY AUTOINCREMENT,
  id_usuario             INTEGER NOT NULL UNIQUE REFERENCES Usuario (id_usuario) ON DELETE CASCADE,
  bloqueo_activo         INTEGER NOT NULL DEFAULT 1,
  intervalo_minutos      INTEGER NOT NULL DEFAULT 120,
  duracion_minutos       INTEGER NOT NULL DEFAULT 15,
  hora_inicio            TEXT    NOT NULL DEFAULT '08:00:00',
  hora_fin               TEXT    NOT NULL DEFAULT '21:00:00',
  notificaciones_activas INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS Ejercicio (
  id_ejercicio  INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo        TEXT    NOT NULL,
  instrucciones TEXT    NOT NULL,
  orden         INTEGER NOT NULL UNIQUE,
  duracion_segundos INTEGER NOT NULL DEFAULT 40,
  pasos         TEXT,
  repeticiones  INTEGER NOT NULL DEFAULT 2
);

CREATE TABLE IF NOT EXISTS ProgresoRotacion (
  id_progreso         INTEGER PRIMARY KEY AUTOINCREMENT,
  id_usuario          INTEGER NOT NULL UNIQUE REFERENCES Usuario (id_usuario) ON DELETE CASCADE,
  id_ultimo_ejercicio INTEGER REFERENCES Ejercicio (id_ejercicio) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sesion_usuario  ON Sesion (id_usuario);
CREATE INDEX IF NOT EXISTS idx_ejercicio_orden ON Ejercicio (orden);
`;

class MotorSQLite {
  constructor(configuracion) {
    this.nombre = 'sqlite';
    this.ruta = configuracion.ruta;
    this.base = null;
  }

  /** Abre (o crea) el archivo de la base de datos. */
  async conectar() {
    const carpeta = path.dirname(this.ruta);
    if (!fs.existsSync(carpeta)) {
      fs.mkdirSync(carpeta, { recursive: true });
    }

    this.base = new DatabaseSync(this.ruta);
    this.base.exec('PRAGMA foreign_keys = ON;');
    this.base.exec('PRAGMA journal_mode = WAL;');
    return this;
  }

  /** Crea las tablas y siembra el catalogo de ejercicios. */
  async crearEsquema() {
    this.base.exec(ESQUEMA);

    // Bases creadas antes de que existieran estas columnas.
    const columnas = this.base.prepare('PRAGMA table_info(Ejercicio)').all().map((c) => c.name);
    const faltantes = {
      duracion_segundos: 'INTEGER NOT NULL DEFAULT 40',
      pasos: 'TEXT',
      repeticiones: 'INTEGER NOT NULL DEFAULT 2',
    };
    for (const [columna, tipo] of Object.entries(faltantes)) {
      if (!columnas.includes(columna)) {
        this.base.exec(`ALTER TABLE Ejercicio ADD COLUMN ${columna} ${tipo}`);
      }
    }

    // Agrega los ejercicios que falten y completa los pasos de los que no
    // los tengan, sin tocar los que alguien ya haya editado.
    const insertar = this.base.prepare(
      `INSERT INTO Ejercicio (titulo, instrucciones, orden, duracion_segundos, pasos, repeticiones)
       VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (orden) DO NOTHING`
    );
    const completar = this.base.prepare(
      `UPDATE Ejercicio SET pasos = ?, repeticiones = ?, duracion_segundos = ?
        WHERE orden = ? AND pasos IS NULL`
    );
    for (const e of EJERCICIOS) {
      const pasos = JSON.stringify(e.pasos);
      insertar.run(e.titulo, e.instrucciones, e.orden, e.duracion_segundos, pasos, e.repeticiones);
      completar.run(pasos, e.repeticiones, e.duracion_segundos, e.orden);
    }
  }

  /** Ejecuta una consulta y devuelve las filas. */
  async consultar(sql, parametros = []) {
    const sentencia = this.base.prepare(sql);
    return sentencia.all(...this.normalizar(parametros));
  }

  /** Ejecuta una consulta que inserta o modifica. */
  async ejecutar(sql, parametros = []) {
    const sentencia = this.base.prepare(sql);
    const info = sentencia.run(...this.normalizar(parametros));
    return {
      id: info.lastInsertRowid === undefined ? null : Number(info.lastInsertRowid),
      cambios: Number(info.changes || 0),
    };
  }

  /** Cierra la base de datos. */
  async cerrar() {
    if (this.base) {
      this.base.close();
      this.base = null;
    }
  }

  /** node:sqlite no acepta undefined: se convierten en null. */
  normalizar(parametros) {
    return parametros.map((valor) => (valor === undefined ? null : valor));
  }
}

module.exports = MotorSQLite;
