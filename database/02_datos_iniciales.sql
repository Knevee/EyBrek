-- =====================================================================
-- EyBrek - Catalogo inicial de ejercicios
-- Catalogo compartido y en rotacion (RF-20, RF-21, RNF-07).
-- Los ejercicios se guardan como datos: agregar o modificar uno no
-- requiere cambiar el codigo.
-- =====================================================================

USE eybrek;

INSERT INTO Ejercicio (titulo, instrucciones, orden) VALUES
  ('Cerca y lejos',
   'Mira tu pulgar 5 segundos y luego algo lejano, refléjalo 5 veces.',
   1),
  ('Parpadeo',
   'Cierra los ojos y mantenlos así por 2 segundos. Repítelo 10 veces.',
   2),
  ('En círculos',
   'Dibuja un círculo con la mirada, 3 veces a cada lado.',
   3),
  ('Palmas',
   'Cubre tus ojos con las palmas tibias por 30 segundos.',
   4)
ON DUPLICATE KEY UPDATE
  titulo        = VALUES(titulo),
  instrucciones = VALUES(instrucciones);
