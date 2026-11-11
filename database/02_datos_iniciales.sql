-- =====================================================================
-- EyBrek - Catalogo inicial de ejercicios
-- Catalogo compartido y en rotacion (RF-20, RF-21, RNF-07).
-- Los ejercicios se guardan como datos: agregar o modificar uno no
-- requiere cambiar el codigo.
--   pasos:             las 4 partes del ejercicio, con sus segundos (JSON)
--   repeticiones:      cuantas rondas de los 4 pasos se hacen
--   duracion_segundos: lo que dura una ronda
-- =====================================================================

USE eybrek;

INSERT INTO Ejercicio (titulo, instrucciones, orden, duracion_segundos, pasos, repeticiones) VALUES
  ('Cerca y lejos',
   'Cambia el enfoque entre algo cercano y algo lejano.',
   1, 20,
   '[{"texto":"Pon tu pulgar a unos 30 cm de tu cara","segundos":5},{"texto":"Mira tu pulgar sin forzar la vista","segundos":5},{"texto":"Ahora mira algo lejano, a más de 6 metros","segundos":5},{"texto":"Vuelve a mirar tu pulgar y respira","segundos":5}]',
   3),
  ('Parpadeo',
   'Cierra y abre los ojos despacio para hidratarlos.',
   2, 15,
   '[{"texto":"Siéntate derecho y relaja los hombros","segundos":4},{"texto":"Cierra los ojos despacio","segundos":3},{"texto":"Mantenlos cerrados sin apretar","segundos":3},{"texto":"Ábrelos y parpadea suave varias veces","segundos":5}]',
   3),
  ('En círculos',
   'Mueve la mirada en círculos sin mover la cabeza.',
   3, 25,
   '[{"texto":"Mira al frente sin mover la cabeza","segundos":4},{"texto":"Dibuja un círculo grande hacia la derecha","segundos":8},{"texto":"Ahora hacia la izquierda, despacio","segundos":8},{"texto":"Cierra los ojos y descansa","segundos":5}]',
   2),
  ('Palmas',
   'Relaja los ojos con el calor y la oscuridad de tus manos.',
   4, 30,
   '[{"texto":"Frota tus manos hasta calentarlas","segundos":6},{"texto":"Cubre tus ojos con las palmas, sin presionar","segundos":4},{"texto":"Respira lento y disfruta la oscuridad","segundos":15},{"texto":"Retira las manos y abre los ojos despacio","segundos":5}]',
   2),
  ('Regla 20-20-20',
   'Mira algo lejano para que tus ojos dejen de enfocar de cerca.',
   5, 30,
   '[{"texto":"Busca un objeto a unos 6 metros","segundos":5},{"texto":"Míralo fijamente, sin forzar","segundos":10},{"texto":"Sigue mirándolo y parpadea normal","segundos":10},{"texto":"Vuelve la vista al frente despacio","segundos":5}]',
   2),
  ('Ocho acostado',
   'Recorre con la mirada un ocho acostado imaginario.',
   6, 28,
   '[{"texto":"Imagina un ocho acostado frente a ti","segundos":4},{"texto":"Recórrelo con la mirada hacia un lado","segundos":10},{"texto":"Ahora recórrelo hacia el otro lado","segundos":10},{"texto":"Cierra los ojos y descansa","segundos":4}]',
   2),
  ('Arriba y abajo',
   'Mueve solo los ojos de arriba a abajo.',
   7, 15,
   '[{"texto":"Mantén la cabeza quieta","segundos":3},{"texto":"Mira hacia arriba sin forzar","segundos":4},{"texto":"Ahora mira hacia abajo","segundos":4},{"texto":"Vuelve al centro y parpadea","segundos":4}]',
   3),
  ('De lado a lado',
   'Mueve solo los ojos de un lado al otro.',
   8, 15,
   '[{"texto":"Mantén la cabeza quieta","segundos":3},{"texto":"Mira hacia la izquierda","segundos":4},{"texto":"Ahora mira hacia la derecha","segundos":4},{"texto":"Vuelve al centro y parpadea","segundos":4}]',
   3),
  ('Diagonales',
   'Mueve los ojos de una esquina a la otra.',
   9, 17,
   '[{"texto":"Mantén la cabeza quieta","segundos":3},{"texto":"Mira arriba a la derecha","segundos":4},{"texto":"Ahora mira abajo a la izquierda","segundos":4},{"texto":"Repite con las otras dos esquinas","segundos":6}]',
   3),
  ('Parpadeo rápido',
   'Parpadea rápido para refrescar tus ojos.',
   10, 24,
   '[{"texto":"Relaja la cara y los hombros","segundos":3},{"texto":"Parpadea rápido y suave","segundos":10},{"texto":"Cierra los ojos y descansa","segundos":8},{"texto":"Ábrelos despacio","segundos":3}]',
   2),
  ('Apretar y abrir',
   'Alterna entre apretar y abrir bien los ojos.',
   11, 13,
   '[{"texto":"Cierra los ojos con fuerza","segundos":3},{"texto":"Ábrelos bien grandes","segundos":3},{"texto":"Ciérralos suavemente","segundos":3},{"texto":"Ábrelos y parpadea normal","segundos":4}]',
   3),
  ('Sigue tu dedo',
   'Sigue tu dedo con la mirada mientras se acerca.',
   12, 17,
   '[{"texto":"Estira el brazo con el índice hacia arriba","segundos":4},{"texto":"Mira la punta de tu dedo","segundos":3},{"texto":"Acércalo despacio a tu nariz sin dejar de mirarlo","segundos":6},{"texto":"Aléjalo de nuevo y parpadea","segundos":4}]',
   3)
ON DUPLICATE KEY UPDATE
  titulo            = VALUES(titulo),
  instrucciones     = VALUES(instrucciones),
  duracion_segundos = VALUES(duracion_segundos),
  pasos             = VALUES(pasos),
  repeticiones      = VALUES(repeticiones);
