-- =====================================================================
-- EyBrek - Catalogo inicial de ejercicios
-- Catalogo compartido y en rotacion (RF-20, RF-21, RNF-07).
-- Los ejercicios se guardan como datos: agregar o modificar uno no
-- requiere cambiar el codigo. duracion_segundos es lo que dura el
-- temporizador del ejercicio (leerlo y hacerlo).
-- =====================================================================

USE eybrek;

INSERT INTO Ejercicio (titulo, instrucciones, orden, duracion_segundos) VALUES
  ('Cerca y lejos',
   'Mira tu pulgar 5 segundos y luego algo lejano otros 5 segundos. Repítelo 5 veces.',
   1, 60),
  ('Parpadeo',
   'Cierra los ojos y mantenlos así por 2 segundos. Repítelo 10 veces.',
   2, 40),
  ('En círculos',
   'Dibuja un círculo grande con la mirada, despacio, 3 veces hacia cada lado.',
   3, 40),
  ('Palmas',
   'Frota tus manos y cubre tus ojos con las palmas tibias durante 30 segundos.',
   4, 40),
  ('Regla 20-20-20',
   'Mira un objeto que esté a unos 6 metros durante 20 segundos, sin mirar la pantalla.',
   5, 30),
  ('Ocho acostado',
   'Dibuja con la mirada un ocho acostado, despacio, 5 veces en un sentido y 5 en el otro.',
   6, 50),
  ('Arriba y abajo',
   'Sin mover la cabeza, mira hacia arriba 2 segundos y luego hacia abajo 2 segundos. Repítelo 10 veces.',
   7, 50),
  ('De lado a lado',
   'Sin mover la cabeza, mira a la izquierda 2 segundos y luego a la derecha 2 segundos. Repítelo 10 veces.',
   8, 50),
  ('Diagonales',
   'Mira la esquina de arriba a la derecha y luego la de abajo a la izquierda, 2 segundos cada una. Hazlo 5 veces y cambia de lado.',
   9, 50),
  ('Parpadeo rápido',
   'Parpadea rápido y suave durante 15 segundos. Luego cierra los ojos y descansa 10 segundos.',
   10, 35),
  ('Apretar y abrir',
   'Cierra los ojos con fuerza 3 segundos y luego ábrelos bien grandes 3 segundos. Repítelo 5 veces.',
   11, 40),
  ('Sigue tu dedo',
   'Pon tu dedo índice a un brazo de distancia y acércalo despacio a la nariz sin dejar de mirarlo. Repítelo 5 veces.',
   12, 45)
ON DUPLICATE KEY UPDATE
  titulo            = VALUES(titulo),
  instrucciones     = VALUES(instrucciones),
  duracion_segundos = VALUES(duracion_segundos);
