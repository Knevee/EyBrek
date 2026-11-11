'use strict';

/**
 * Catalogo inicial de ejercicios (RNF-07).
 * Cada motor lo usa para sembrar la tabla Ejercicio: agrega los que
 * falten por su orden y completa los pasos de los que no los tengan,
 * sin tocar lo que alguien ya haya editado.
 *
 * pasos: las 4 partes del ejercicio, cada una con sus segundos. En la
 *   pantalla se recorren en orden y se resalta la que toca.
 * repeticiones: cuantas rondas de los 4 pasos se hacen (2 o 3).
 * duracion_segundos: lo que dura una ronda (la suma de los pasos).
 */

const paso = (texto, segundos) => ({ texto, segundos });

const EJERCICIOS = [
  {
    orden: 1, titulo: 'Cerca y lejos', repeticiones: 3,
    instrucciones: 'Cambia el enfoque entre algo cercano y algo lejano.',
    pasos: [
      paso('Pon tu pulgar a unos 30 cm de tu cara', 5),
      paso('Mira tu pulgar sin forzar la vista', 5),
      paso('Ahora mira algo lejano, a más de 6 metros', 5),
      paso('Vuelve a mirar tu pulgar y respira', 5),
    ],
  },
  {
    orden: 2, titulo: 'Parpadeo', repeticiones: 3,
    instrucciones: 'Cierra y abre los ojos despacio para hidratarlos.',
    pasos: [
      paso('Siéntate derecho y relaja los hombros', 4),
      paso('Cierra los ojos despacio', 3),
      paso('Mantenlos cerrados sin apretar', 3),
      paso('Ábrelos y parpadea suave varias veces', 5),
    ],
  },
  {
    orden: 3, titulo: 'En círculos', repeticiones: 2,
    instrucciones: 'Mueve la mirada en círculos sin mover la cabeza.',
    pasos: [
      paso('Mira al frente sin mover la cabeza', 4),
      paso('Dibuja un círculo grande hacia la derecha', 8),
      paso('Ahora hacia la izquierda, despacio', 8),
      paso('Cierra los ojos y descansa', 5),
    ],
  },
  {
    orden: 4, titulo: 'Palmas', repeticiones: 2,
    instrucciones: 'Relaja los ojos con el calor y la oscuridad de tus manos.',
    pasos: [
      paso('Frota tus manos hasta calentarlas', 6),
      paso('Cubre tus ojos con las palmas, sin presionar', 4),
      paso('Respira lento y disfruta la oscuridad', 15),
      paso('Retira las manos y abre los ojos despacio', 5),
    ],
  },
  {
    orden: 5, titulo: 'Regla 20-20-20', repeticiones: 2,
    instrucciones: 'Mira algo lejano para que tus ojos dejen de enfocar de cerca.',
    pasos: [
      paso('Busca un objeto a unos 6 metros', 5),
      paso('Míralo fijamente, sin forzar', 10),
      paso('Sigue mirándolo y parpadea normal', 10),
      paso('Vuelve la vista al frente despacio', 5),
    ],
  },
  {
    orden: 6, titulo: 'Ocho acostado', repeticiones: 2,
    instrucciones: 'Recorre con la mirada un ocho acostado imaginario.',
    pasos: [
      paso('Imagina un ocho acostado frente a ti', 4),
      paso('Recórrelo con la mirada hacia un lado', 10),
      paso('Ahora recórrelo hacia el otro lado', 10),
      paso('Cierra los ojos y descansa', 4),
    ],
  },
  {
    orden: 7, titulo: 'Arriba y abajo', repeticiones: 3,
    instrucciones: 'Mueve solo los ojos de arriba a abajo.',
    pasos: [
      paso('Mantén la cabeza quieta', 3),
      paso('Mira hacia arriba sin forzar', 4),
      paso('Ahora mira hacia abajo', 4),
      paso('Vuelve al centro y parpadea', 4),
    ],
  },
  {
    orden: 8, titulo: 'De lado a lado', repeticiones: 3,
    instrucciones: 'Mueve solo los ojos de un lado al otro.',
    pasos: [
      paso('Mantén la cabeza quieta', 3),
      paso('Mira hacia la izquierda', 4),
      paso('Ahora mira hacia la derecha', 4),
      paso('Vuelve al centro y parpadea', 4),
    ],
  },
  {
    orden: 9, titulo: 'Diagonales', repeticiones: 3,
    instrucciones: 'Mueve los ojos de una esquina a la otra.',
    pasos: [
      paso('Mantén la cabeza quieta', 3),
      paso('Mira arriba a la derecha', 4),
      paso('Ahora mira abajo a la izquierda', 4),
      paso('Repite con las otras dos esquinas', 6),
    ],
  },
  {
    orden: 10, titulo: 'Parpadeo rápido', repeticiones: 2,
    instrucciones: 'Parpadea rápido para refrescar tus ojos.',
    pasos: [
      paso('Relaja la cara y los hombros', 3),
      paso('Parpadea rápido y suave', 10),
      paso('Cierra los ojos y descansa', 8),
      paso('Ábrelos despacio', 3),
    ],
  },
  {
    orden: 11, titulo: 'Apretar y abrir', repeticiones: 3,
    instrucciones: 'Alterna entre apretar y abrir bien los ojos.',
    pasos: [
      paso('Cierra los ojos con fuerza', 3),
      paso('Ábrelos bien grandes', 3),
      paso('Ciérralos suavemente', 3),
      paso('Ábrelos y parpadea normal', 4),
    ],
  },
  {
    orden: 12, titulo: 'Sigue tu dedo', repeticiones: 3,
    instrucciones: 'Sigue tu dedo con la mirada mientras se acerca.',
    pasos: [
      paso('Estira el brazo con el índice hacia arriba', 4),
      paso('Mira la punta de tu dedo', 3),
      paso('Acércalo despacio a tu nariz sin dejar de mirarlo', 6),
      paso('Aléjalo de nuevo y parpadea', 4),
    ],
  },
].map((e) => ({ ...e, duracion_segundos: e.pasos.reduce((suma, p) => suma + p.segundos, 0) }));

module.exports = { EJERCICIOS };
