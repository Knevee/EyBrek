-- =====================================================================
-- EyBrek - Esquema de la base de datos MySQL
--
-- Este script es OPCIONAL. El servidor usa SQLite por defecto y crea la
-- base de datos solo, sin instalar nada y sin contrasenas.
--
-- Use este script solo si quiere MySQL (por ejemplo, para tener una base
-- de datos central compartida por todo el equipo). En ese caso ejecute
-- primero "instalar-base-datos.ps1", que se encarga de todo.
--
-- Equivalente del modelo entidad-relacion de la Figura 2 del documento.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS eybrek
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE eybrek;

-- ---------------------------------------------------------------------
-- Entidad: Usuario
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Usuario (
  id_usuario      INT AUTO_INCREMENT PRIMARY KEY,
  nombre          VARCHAR(100) NOT NULL,
  correo          VARCHAR(150) NOT NULL UNIQUE,
  contrasena_hash VARCHAR(255) NOT NULL,
  fecha_creacion  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Entidad: Sesion  (Usuario 1 a N Sesion)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Sesion (
  id_sesion    INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario   INT         NOT NULL,
  token        VARCHAR(255) NOT NULL UNIQUE,
  fecha_inicio DATETIME    NOT NULL,
  CONSTRAINT fk_sesion_usuario
    FOREIGN KEY (id_usuario) REFERENCES Usuario (id_usuario)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Entidad: Configuracion  (Usuario 1 a 1 Configuracion)
-- Los valores por defecto corresponden al RF-12.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Configuracion (
  id_configuracion       INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario             INT      NOT NULL UNIQUE,
  bloqueo_activo         BOOLEAN  NOT NULL DEFAULT TRUE,
  intervalo_minutos      INT      NOT NULL DEFAULT 120,
  duracion_minutos       INT      NOT NULL DEFAULT 15,
  hora_inicio            TIME     NOT NULL DEFAULT '08:00:00',
  hora_fin               TIME     NOT NULL DEFAULT '21:00:00',
  notificaciones_activas BOOLEAN  NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_configuracion_usuario
    FOREIGN KEY (id_usuario) REFERENCES Usuario (id_usuario)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Entidad: Ejercicio  (catalogo en rotacion, RNF-07)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Ejercicio (
  id_ejercicio  INT AUTO_INCREMENT PRIMARY KEY,
  titulo        VARCHAR(100) NOT NULL,
  instrucciones TEXT         NOT NULL,
  orden         INT          NOT NULL UNIQUE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Entidad: ProgresoRotacion  (Usuario 1 a 1 ProgresoRotacion, N a 1 Ejercicio)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ProgresoRotacion (
  id_progreso         INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario          INT NOT NULL UNIQUE,
  id_ultimo_ejercicio INT NULL,
  CONSTRAINT fk_progreso_usuario
    FOREIGN KEY (id_usuario) REFERENCES Usuario (id_usuario)
    ON DELETE CASCADE,
  CONSTRAINT fk_progreso_ejercicio
    FOREIGN KEY (id_ultimo_ejercicio) REFERENCES Ejercicio (id_ejercicio)
    ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX IF NOT EXISTS idx_sesion_usuario  ON Sesion (id_usuario);
CREATE INDEX IF NOT EXISTS idx_ejercicio_orden ON Ejercicio (orden);
