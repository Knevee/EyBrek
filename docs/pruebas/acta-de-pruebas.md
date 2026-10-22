# EyBrek — Acta de pruebas

**Proyecto:** EyBrek — bloqueo periódico de pantalla con ejercicios visuales
**Etapa:** implementación del segundo corte
**Fecha:** 21 de octubre de 2026
**Entorno de prueba:** Windows 11, Node.js 24.13.1, MySQL 8.0.45, Electron 33

---

## 1. Herramientas de prueba

| Herramienta | Propósito | Resultado |
|---|---|---|
| `server/pruebas/api.test.js` | Pruebas automáticas de la API (node:test + supertest) | **19 de 19 aprobadas** |
| `docs/pruebas/verificar-api.ps1` | Verificación de la API contra el servidor en marcha | **25 de 25 aprobadas** |
| Inspección manual | Comportamiento del cliente de escritorio | Las 3 pantallas revisadas |

Comandos:

```powershell
cd EyBrek\server
npm run pruebas

powershell -ExecutionPolicy Bypass -File docs\pruebas\verificar-api.ps1
```

Las pruebas se ejecutaron con **los dos motores de base de datos** y ambos
dieron el mismo resultado:

| Motor | Resultado |
|---|---|
| SQLite (por defecto) | 19/19 y 25/25 |
| MySQL (opcional) | 19/19 |

---

## 2. Requisitos funcionales

| ID | Requisito | Método | Caso de prueba | Resultado |
|---|---|---|---|---|
| RF-01 | Registrar una cuenta con nombre, correo y contraseña | Prueba | `RF-01: registra una cuenta nueva` | **Aprobado** |
| RF-02 | Rechazar correo ya registrado o con formato inválido | Prueba | `RF-02: rechaza un correo ya registrado` / `...formato invalido` | **Aprobado** |
| RF-03 | Iniciar sesión con correo y contraseña | Prueba | `RF-03: inicia sesion con correo y contrasena correctos` | **Aprobado** |
| RF-04 | Cerrar la sesión activa | Prueba | `RF-04: cierra la sesion y el token deja de servir` | **Aprobado** |
| RF-05 | Activar o desactivar el bloqueo | Inspección | Interruptor «Activar bloqueo» en la pantalla de configuración | **Aprobado** |
| RF-06 | Definir el intervalo entre bloqueos | Prueba | `RF-10 y RF-13` (intervalo 30 min) | **Aprobado** |
| RF-07 | Definir la duración de cada bloqueo | Prueba | `RF-10 y RF-13` (duración 5 min) | **Aprobado** |
| RF-08 | Definir el horario de activación | Prueba | `RF-10 y RF-13` (09:00 – 18:00) | **Aprobado** |
| RF-09 | Activar o desactivar las notificaciones | Prueba | `RF-10 y RF-13` (`notificaciones_activas: false`) | **Aprobado** |
| RF-10 | Guardar la configuración al presionar «Guardar cambios» | Prueba | `RF-10 y RF-13` + inspección de la pantalla | **Aprobado** |
| RF-11 | Validar intervalo (15 min – 8 h), duración (1–30 min) y duración < intervalo | Prueba | `RF-11` × 4 casos de rango | **Aprobado** |
| RF-12 | Asignar la configuración por defecto a toda cuenta nueva | Inspección | `RF-12: la cuenta nueva recibe la configuracion por defecto` | **Aprobado** |
| RF-13 | Almacenar la configuración en el servidor | Prueba | `RF-10 y RF-13` (relectura desde el servidor) | **Aprobado** |
| RF-14 | Recuperar la configuración al iniciar sesión desde cualquier equipo | Prueba | `RF-03` + `RF-12` (la configuración viene en la respuesta del login) | **Aprobado** |
| RF-15 | Conservar una copia local de la última configuración | Inspección | Archivo `config-local.json` en `%APPDATA%\eybrek-client` | **Aprobado** |
| RF-16 | Bloquear cuando se cumpla el intervalo, solo dentro del horario | Demostración | Bloqueo observado con intervalo de 2 h dentro del horario | **Aprobado** |
| RF-17 | Avisar 1 minuto antes del bloqueo | Demostración | Notificación del sistema antes de la pausa | **Aprobado** |
| RF-18 | Mantener el bloqueo sin opción de omitirlo | Demostración | La ventana de bloqueo no tiene botón de cerrar | **Aprobado** |
| RF-19 | Mostrar la hora actual y la hora de fin | Demostración | Pantalla de bloqueo: `15:22` y `El descanso termina a las 3:37 p. m.` | **Aprobado** |
| RF-20 | Mostrar un ejercicio con título e instrucciones | Demostración | «Cerca y lejos» con sus instrucciones | **Aprobado** |
| RF-21 | Rotación ordenada, un ejercicio por bloqueo, y vuelta al primero | Prueba | `RF-21: la rotacion avanza un ejercicio por consulta y vuelve al primero` | **Aprobado** |
| RF-22 | Desbloquear al terminar la duración | Demostración | Cierre automático de la ventana al agotarse el tiempo | **Aprobado** |
| RF-23 | Reiniciar el conteo del intervalo tras desbloquear | Inspección | Log `Bloqueo terminado: se reinicia el conteo del intervalo.` | **Aprobado** |
| RF-24 | Detener el conteo y los bloqueos sin sesión iniciada | Prueba | `RF-24: rechaza una peticion sin token` / `...token inventado` | **Aprobado** |

---

## 3. Requisitos no funcionales

| ID | Requisito | Método | Evidencia | Resultado |
|---|---|---|---|---|
| RNF-01 | Configurar el intervalo y la duración en menos de 2 minutos | Prueba con usuario | Pendiente de ejecución con una persona externa al equipo (ver sección 4) | **Pendiente** |
| RNF-02 | Contraseñas cifradas con hash, nunca en texto plano | Inspección | `RNF-02: la contrasena se guarda cifrada` (hash bcrypt `$2a$`) | **Aprobado** |
| RNF-03 | Bloquear con una desviación máxima de 2 segundos | Prueba | El temporizador evalúa cada segundo; desviación observada < 1 s | **Aprobado** |
| RNF-04 | Responder al inicio de sesión en menos de 3 segundos | Prueba | Inicio de sesión medido en red local: 0,07 s – 0,09 s | **Aprobado** |
| RNF-05 | Seguir bloqueando con la copia local si el servidor no está disponible | Prueba | Con el servidor detenido, el cliente sigue bloqueando usando `config-local.json` | **Aprobado** |
| RNF-06 | Funcionar en Windows 10 y Windows 11 | Prueba | Ejecutado en Windows 11 (1920×864, escalado 125 %). El cliente usa únicamente API de Electron multiplataforma | **Aprobado en Windows 11** |
| RNF-07 | Almacenar los ejercicios como datos | Inspección | Tabla `Ejercicio` con 4 filas; agregar un ejercicio es un `INSERT` | **Aprobado** |

> RNF-06 quedó verificado únicamente en Windows 11, que es el equipo
> disponible. La compatibilidad con Windows 10 se apoya en el uso de API de
> Electron estables, pero falta ejecutarla en un equipo con Windows 10.

---

## 4. Revisión de la interfaz con una persona externa — **pendiente de ejecutar**

La revisión descrita en la sección 4.9 del documento de diseño **todavía no se
ha ejecutado**: falta realizarla con una persona ajena al equipo. Lo que sí
está hecho es que los cinco ajustes que esa revisión propone quedaron
implementados en el código, de manera que la prueba solo tiene que confirmar
que funcionan.

| # | Dificultad prevista | Pantalla | Ajuste ya implementado | Estado |
|---|---|---|---|---|
| 1 | Duda si el intervalo y la duración se medían en minutos u horas | Configuración | Los selectores muestran la unidad: «15 minutos», «1 hora», «2 horas» | Implementado, falta verificar |
| 2 | El mensaje de valor inválido no indicaba el rango (RF-11) | Configuración | El mensaje dice el rango exacto: *«El intervalo debe estar entre 15 minutos y 8 horas (480 minutos).»* | Implementado, falta verificar |
| 3 | No supo si la configuración se había guardado (RF-10) | Configuración | Al presionar «Guardar cambios» aparece un mensaje de confirmación visible | Implementado, falta verificar |
| 4 | No entendió cuánto faltaba para terminar el bloqueo (RF-19) | Bloqueo | Se resalta la hora de fin del descanso y se añade la cuenta regresiva «Faltan 14 min 51 s para desbloquear» | Implementado, falta verificar |
| 5 | No vio qué ejercicio viene después | Bloqueo | Se añadió la línea «Siguiente: Parpadeo» y la lista completa con el ejercicio actual resaltado | Implementado, falta verificar |

**Datos que faltan para cerrar la prueba** (se dejan en blanco a propósito,
para llenarlos con la evidencia real de la sesión):

- Perfil del participante: ______________________________
- Fecha y hora de la sesión: ______________________________
- Tiempo total del registro y la configuración: ______ (meta del RNF-01: máximo 2 min)
- Dificultades adicionales observadas: ______________________________

---

## 5. Pruebas de la base de datos

| Prueba | Resultado |
|---|---|
| La base de datos se crea sola en el primer arranque, sin pedir contraseñas | Correcto |
| Se crean las 5 entidades con sus PK, FK, unicidades y reglas de borrado en cascada | Correcto |
| El catálogo inicial de 4 ejercicios queda sembrado | Correcto |
| El borrado de un usuario elimina en cascada su sesión, su configuración y su progreso | Correcto |
| El servidor funciona igual con SQLite y con MySQL | Correcto |
| Las consultas usan siempre parámetros, nunca SQL construido por concatenación | Correcto |

---

## 6. Incidencias encontradas y corregidas

| # | Incidencia | Causa | Solución |
|---|---|---|---|
| 1 | El campo «Nombre» aparecía en la pantalla de inicio de sesión | La regla CSS `display: block` anulaba el atributo `hidden` | Se añadió `[hidden] { display: none !important; }` |
| 2 | La configuración se salía de la ventana en pantallas anchas | El elemento flex no podía encogerse por debajo de su contenido mínimo | `min-width: 0` en `.contenido` y `minmax(0, 1fr)` en la rejilla |
| 3 | El texto de las tarjetas se partía en una sola letra | El control ancho consumía toda la columna de texto | Las tarjetas con controles anchos colocan el control en su propia fila |
| 4 | El cliente no restauraba la sesión al arrancar | El archivo local se escribía con marca de byte order mark (BOM) | Se eliminó la marca al leer y se corrigió la escritura |
| 5 | `localhost` no respondía en el equipo de pruebas | `localhost` resolvía a IPv6 (`::1`) y el servidor escucha en IPv4 | El cliente usa `127.0.0.1` y la URL del servidor es configurable |
| 6 | La dirección IP del servidor dejó de existir al cambiar de red | La IP estaba escrita en el archivo de configuración | El cliente usa el **nombre del equipo**, que se resuelve en la red local, y la IP queda como respaldo |
| 7 | El cliente esperaba 8 segundos en cada petición cuando el servidor no respondía | No había detección de servidor: cada petición probaba la dirección a ciegas | Se añadió detección con memoria del servidor que responde (2 s) y reintento automático |
| 8 | Guardar la misma configuración dos vecesProvocaba un bucle infinito en el servidor | En MySQL, `affectedRows` es 0 cuando los valores no cambian, y el código lo confundía con «no existe» | Ahora se comprueba la existencia antes de actualizar |
| 9 | La instalación exigía conocer la contraseña de root de MySQL | El script pedía la clave de un superusuario a un usuario final | La base por defecto es **SQLite**: la base se crea sola, sin contraseñas. MySQL quedó como opción con su propio instalador |

---

## 7. Conclusión

Las 24 pruebas de requisitos funcionales y las 5 de base de datos fueron
ejecutadas y **aprobadas**, con los dos motores de base de datos. De los 7
requisitos no funcionales, 5 quedaron **aprobados**, 1 quedó **pendiente**
(RNF-01, requiere una persona externa) y 1 quedó **aprobado solo en Windows
11** (RNF-06). Se corrigieron 9 incidencias durante la implementación.

El sistema cumple el alcance definido en la sección 4.1 del documento de
diseño, con una diferencia que hay que registrar: **el motor de base de datos
por defecto es SQLite y no MySQL**, para que la aplicación se pueda instalar
y usar sin pedir ninguna contraseña. MySQL sigue disponible para quien quiera
una base de datos central. El detalle está en la sección 4.5 del documento.

Quedan pendientes, por decisión del equipo y porque ya están registradas como
tareas futuras en la sección 4.10 del documento: ejecutar la revisión de
interfaz con una persona externa, cifrar la comunicación con HTTPS, distribuir
la aplicación como instalador `.exe` y evaluar mecanismos más fuertes contra
el cierre forzado de la pantalla de bloqueo.
