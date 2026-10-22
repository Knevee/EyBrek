'use strict';

/**
 * Motor de base de datos: MySQL
 *
 * Motor opcional, para cuando se quiere una base de datos central
 * (por ejemplo, la compartida por todo el equipo). Se activa con
 * DB_MOTOR=mysql en el archivo .env del servidor.
 *
 * Usa el usuario de aplicacion 'eybrek', que solo tiene permisos sobre
 * la base `eybrek`. Nunca se usa root.
 */

const mysql = require('mysql2/promise');

const ESQUEMA = `
CREATE TABLE IF NOT EXISTS Usuario (
  id_usuario      INT AUTO_INCREMENT PRIMARY KEY,
  nombre          VARCHAR(100) NOT NULL,
  correo          VARCHAR(150) NOT NULL UNIQUE,
  contrasena_hash VARCHAR(255) NOT NULL,
  fecha_creacion  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Sesion (
  id_sesion    INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario   INT         NOT NULL,
  token        VARCHAR(255) NOT NULL UNIQUE,
  fecha_inicio DATETIME    NOT NULL,
  CONSTRAINT fk_sesion_usuario FOREIGN KEY (id_usuario)
    REFERENCES Usuario (id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Configuracion (
  id_configuracion       INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario             INT      NOT NULL UNIQUE,
  bloqueo_activo         BOOLEAN  NOT NULL DEFAULT TRUE,
  intervalo_minutos      INT      NOT NULL DEFAULT 120,
  duracion_minutos       INT      NOT NULL DEFAULT 15,
  hora_inicio            TIME     NOT NULL DEFAULT '08:00:00',
  hora_fin               TIME     NOT NULL DEFAULT '21:00:00',
  notificaciones_activas BOOLEAN  NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_configuracion_usuario FOREIGN KEY (id_usuario)
    REFERENCES Usuario (id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Ejercicio (
  id_ejercicio  INT AUTO_INCREMENT PRIMARY KEY,
  titulo        VARCHAR(100) NOT NULL,
  instrucciones TEXT         NOT NULL,
  orden         INT          NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ProgresoRotacion (
  id_progreso         INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario          INT NOT NULL UNIQUE,
  id_ultimo_ejercicio INT NULL,
  CONSTRAINT fk_progreso_usuario FOREIGN KEY (id_usuario)
    REFERENCES Usuario (id_usuario) ON DELETE CASCADE,
  CONSTRAINT fk_progreso_ejercicio FOREIGN KEY (id_ultimo_ejercicio)
    REFERENCES Ejercicio (id_ejercicio) ON DELETE SET NULL
) ENGINE=InnoDB;
`;

class MotorMySQL {
  constructor(configuracion) {
    this.nombre = 'mysql';
    this.configuracion = configuracion;
    this.pool = null;
  }

  async conectar() {
    this.pool = mysql.createPool({
      host: this.configuracion.host,
      port: this.configuracion.puerto,
      user: this.configuracion.usuario,
      password: this.configuracion.contrasena,
      database: this.configuracion.baseDatos,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: 'utf8mb4',
      dateStrings: true,
    });

    await this.pool.query('SELECT 1');
    return this;
  }

  /** Crea las tablas si no existen. La base de datos debe existir antes. */
  async crearEsquema() {
    for (const sentencia of ESQUEMA.split(';')) {
      const sql = sentencia.trim();
      if (sql) await this.pool.query(sql);
    }
  }

  async consultar(sql, parametros = []) {
    const [filas] = await this.pool.execute(sql, parametros);
    return filas;
  }

  async ejecutar(sql, parametros = []) {
    const [resultado] = await this.pool.execute(sql, parametros);
    return {
      id: resultado.insertId === undefined ? null : resultado.insertId,
      cambios: resultado.affectedRows,
    };
  }

  async cerrar() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}

module.exports = MotorMySQL;
