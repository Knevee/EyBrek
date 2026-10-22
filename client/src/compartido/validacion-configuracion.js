(function (raiz, fabrica) {
  'use strict';

  if (typeof module === 'object' && module.exports) {
    module.exports = fabrica();
  } else {
    raiz.EyBrekValidacion = fabrica();
  }
})(
  typeof self !== 'undefined' ? self : this,
  function () {
    'use strict';

    /** Reglas del RF-11. */
    var LIMITES = {
      intervaloMinimo: 15,    // 15 minutos
      intervaloMaximo: 480,   // 8 horas
      duracionMinima: 1,      // 1 minuto
      duracionMaxima: 30      // 30 minutos
    };

    var FORMATO_HORA = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;

    /** Normaliza una hora a HH:MM. Devuelve null si el formato no es valido. */
    function normalizarHora(valor) {
      var coincidencia = FORMATO_HORA.exec(String(valor || '').trim());
      if (!coincidencia) return null;
      return coincidencia[1] + ':' + coincidencia[2];
    }

    /**
     * Valida la configuracion del usuario (RF-11).
     * Devuelve la lista de mensajes de error y los valores normalizados.
     */
    function validarConfiguracion(datos) {
      var errores = [];
      var intervalo = Number(datos && datos.intervalo_minutos);
      var duracion = Number(datos && datos.duracion_minutos);
      var horaInicio = normalizarHora(datos && datos.hora_inicio);
      var horaFin = normalizarHora(datos && datos.hora_fin);

      if (!isFinite(intervalo) || Math.floor(intervalo) !== intervalo) {
        errores.push('El intervalo debe ser un numero entero de minutos.');
      } else if (intervalo < LIMITES.intervaloMinimo || intervalo > LIMITES.intervaloMaximo) {
        errores.push('El intervalo debe estar entre 15 minutos y 8 horas (480 minutos).');
      }

      if (!isFinite(duracion) || Math.floor(duracion) !== duracion) {
        errores.push('La duracion debe ser un numero entero de minutos.');
      } else if (duracion < LIMITES.duracionMinima || duracion > LIMITES.duracionMaxima) {
        errores.push('La duracion del bloqueo debe estar entre 1 y 30 minutos.');
      } else if (isFinite(intervalo) && duracion >= intervalo) {
        errores.push('La duracion del bloqueo debe ser menor que el intervalo.');
      }

      if (!horaInicio) errores.push('La hora de inicio no tiene un formato valido.');
      if (!horaFin) errores.push('La hora de fin no tiene un formato valido.');
      if (horaInicio && horaFin && horaInicio === horaFin) {
        errores.push('La hora de fin debe ser distinta de la hora de inicio.');
      }

      return {
        errores: errores,
        valores: {
          bloqueo_activo: Boolean(datos && datos.bloqueo_activo),
          intervalo_minutos: intervalo,
          duracion_minutos: duracion,
          hora_inicio: horaInicio,
          hora_fin: horaFin,
          notificaciones_activas: Boolean(datos && datos.notificaciones_activas)
        }
      };
    }

    /** Convierte minutos en un texto legible: 120 -> "2 horas", 45 -> "45 minutos". */
    function textoDuracion(minutos) {
      var valor = Number(minutos);
      if (!isFinite(valor)) return '';
      if (valor >= 60 && valor % 60 === 0) {
        var horas = valor / 60;
        return horas + (horas === 1 ? ' hora' : ' horas');
      }
      return valor + ' minutos';
    }

    return {
      LIMITES: LIMITES,
      normalizarHora: normalizarHora,
      validarConfiguracion: validarConfiguracion,
      textoDuracion: textoDuracion
    };
  }
);
