-- =====================================================================
-- EyBrek - Esquema completo de la base de datos
--
-- Este archivo sirve para ver el diagrama ER en MySQL Workbench:
--   File > New Model  ->  File > Import > SQL Script  ->  este archivo
--   Clic derecho en el esquema -> EER Diagram -> New EER Diagram
--
-- El servidor de EyBrek usa SQLite por defecto (la base se crea sola) y
-- MySQL de forma opcional. El modelo de datos es el mismo en los dos.
-- =====================================================================

CREATE TABLE Usuario (
  id_usuario      INT AUTO_INCREMENT PRIMARY KEY,
  nombre          VARCHAR(100) NOT NULL,
  correo          VARCHAR(150) NOT NULL UNIQUE,
  contrasena_hash VARCHAR(255) NOT NULL,
  fecha_creacion  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE Sesion (
  id_sesion    INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario   INT         NOT NULL,
  token        VARCHAR(255) NOT NULL UNIQUE,
  fecha_inicio DATETIME    NOT NULL,
  CONSTRAINT fk_sesion_usuario
    FOREIGN KEY (id_usuario) REFERENCES Usuario (id_usuario)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE Configuracion (
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

CREATE TABLE Ejercicio (
  id_ejercicio  INT AUTO_INCREMENT PRIMARY KEY,
  titulo        VARCHAR(100) NOT NULL,
  instrucciones TEXT         NOT NULL,
  orden         INT          NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE ProgresoRotacion (
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
