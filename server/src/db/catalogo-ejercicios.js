'use strict';

/**
 * Catalogo inicial de ejercicios (RNF-07).
 * Cada motor lo usa para sembrar la tabla Ejercicio: solo agrega los que
 * falten por su orden, sin tocar los que alguien ya haya editado.
 *
 * duracion_segundos: tiempo para leer la instruccion (unos 10 s) mas el
 * tiempo que toma hacer el ejercicio. Es lo que dura el temporizador.
 */
const EJERCICIOS = [
  { orden: 1, titulo: 'Cerca y lejos', duracion_segundos: 60,
    instrucciones: 'Mira tu pulgar 5 segundos y luego algo lejano otros 5 segundos. Repítelo 5 veces.' },
  { orden: 2, titulo: 'Parpadeo', duracion_segundos: 40,
    instrucciones: 'Cierra los ojos y mantenlos así por 2 segundos. Repítelo 10 veces.' },
  { orden: 3, titulo: 'En círculos', duracion_segundos: 40,
    instrucciones: 'Dibuja un círculo grande con la mirada, despacio, 3 veces hacia cada lado.' },
  { orden: 4, titulo: 'Palmas', duracion_segundos: 40,
    instrucciones: 'Frota tus manos y cubre tus ojos con las palmas tibias durante 30 segundos.' },
  { orden: 5, titulo: 'Regla 20-20-20', duracion_segundos: 30,
    instrucciones: 'Mira un objeto que esté a unos 6 metros durante 20 segundos, sin mirar la pantalla.' },
  { orden: 6, titulo: 'Ocho acostado', duracion_segundos: 50,
    instrucciones: 'Dibuja con la mirada un ocho acostado, despacio, 5 veces en un sentido y 5 en el otro.' },
  { orden: 7, titulo: 'Arriba y abajo', duracion_segundos: 50,
    instrucciones: 'Sin mover la cabeza, mira hacia arriba 2 segundos y luego hacia abajo 2 segundos. Repítelo 10 veces.' },
  { orden: 8, titulo: 'De lado a lado', duracion_segundos: 50,
    instrucciones: 'Sin mover la cabeza, mira a la izquierda 2 segundos y luego a la derecha 2 segundos. Repítelo 10 veces.' },
  { orden: 9, titulo: 'Diagonales', duracion_segundos: 50,
    instrucciones: 'Mira la esquina de arriba a la derecha y luego la de abajo a la izquierda, 2 segundos cada una. Hazlo 5 veces y cambia de lado.' },
  { orden: 10, titulo: 'Parpadeo rápido', duracion_segundos: 35,
    instrucciones: 'Parpadea rápido y suave durante 15 segundos. Luego cierra los ojos y descansa 10 segundos.' },
  { orden: 11, titulo: 'Apretar y abrir', duracion_segundos: 40,
    instrucciones: 'Cierra los ojos con fuerza 3 segundos y luego ábrelos bien grandes 3 segundos. Repítelo 5 veces.' },
  { orden: 12, titulo: 'Sigue tu dedo', duracion_segundos: 45,
    instrucciones: 'Pon tu dedo índice a un brazo de distancia y acércalo despacio a la nariz sin dejar de mirarlo. Repítelo 5 veces.' },
];

module.exports = { EJERCICIOS };
