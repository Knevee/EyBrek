# EyBrek

**EyBrek** es una aplicación de escritorio para Windows que bloquea la pantalla
de forma periódica y muestra ejercicios visuales durante la pausa, para
fomentar descansos regulares y contribuir al cuidado de la salud visual.

Este repositorio contiene la implementación del sistema descrita en el
documento de diseño del segundo corte (*EyBrek — Proyecto de aula: avance del
segundo corte*, Diseño de Software I, UDES), que está en
[`docs/documento/`](docs/documento/).

---

## 1. Instalación

Doble clic en **`client\dist\EyBrek-Instalador-1.0.0.exe`**. EyBrek se instala,
crea accesos directos en el escritorio y en el menú Inicio, y usa el servidor
en la nube (Supabase). No hace falta instalar nada más.

### Para desarrollar (desde el código fuente)

Requisitos: **Node.js 22.5 o superior** y Windows 10 u 11.

```powershell
# Abrir la aplicación desde el código
cd EyBrek\client
npm install
npm start

# Solo si se usa el servidor propio ("modo": "local" en client/src/config.json)
cd EyBrek\server
npm install
npm start
```

Con el servidor propio no hace falta instalar MySQL: la base de datos es un
archivo (`server/datos/eybrek.db`) que se crea solo. MySQL es opcional (ver la
sección 6).

---

### Versión en la nube e instalador

EyBrek también puede usar **Supabase** como servidor en la nube y se
distribuye como **instalador de Windows** (`EyBrek-Instalador-1.0.0.exe`).
Los pasos están en [`docs/nube-e-instalador.md`](docs/nube-e-instalador.md).

---

## 2. Arquitectura

Arquitectura **cliente-servidor en tres capas**, tal como se define en la
sección 4.5 del documento de diseño.

```
  PC de cada usuario (Windows)              PC del servidor (sin nube)
 ┌────────────────────────────────┐        ┌──────────────────────────────┐
 │  Cliente de escritorio         │        │  Servidor (Node.js + Express)│
 │  ┌──────────────────────────┐  │  HTTP  │  ┌────────────────────────┐  │
 │  │ Interfaz de usuario      │  │  +JSON │  │ Autenticación          │  │
 │  │ Temporizador            │  │ ─────► │  │ Configuración          │  │
 │  │ Bloqueo de pantalla      │  │        │  │ Ejercicios             │  │
 │  │ Comunicación y copia     │  │        │  │ Acceso a datos         │  │
 │  │ local                   │  │        │  └───────────┬────────────┘  │
 │  └──────────────────────────┘  │        │              │                 │
 │            │                    │        │   ┌──────────▼───────────┐     │
 │  ┌─────────▼──────────┐        │        │   │ SQLite (archivo)     │     │
 │  │ Copia local de la  │        │        │   │ o MySQL (opcional)   │     │
 │  │ configuración      │        │        │   └──────────────────────┘     │
 │  └────────────────────┘        │        └──────────────────────────────┘
 └────────────────────────────────┘
```

El servidor se ejecuta en un computador propio, **sin nube**. El cliente sigue
funcionando con la copia local de la configuración cuando el servidor no está
disponible (RNF-05), sin avisar al usuario.

---

## 3. Estructura del proyecto

```
EyBrek/
├── database/                    Esquema de la base de datos
│   ├── 01_esquema_mysql.sql     Tablas (solo si se usa MySQL)
│   ├── 02_datos_iniciales.sql   Catálogo inicial de 4 ejercicios
│   ├── esquema-completo.sql     Para importar en MySQL Workbench
│   └── instalar-base-datos.ps1  Instalador de MySQL (opcional)
│
├── server/                      Servidor (Node.js + Express)
│   ├── src/
│   │   ├── server.js            Arranque y apagado ordenado
│   │   ├── app.js               Aplicación Express (capa de presentación)
│   │   ├── config/entorno.js    Configuración (variables de entorno)
│   │   ├── db/
│   │   │   ├── conexion.js      Elige el motor y oculta la conexión
│   │   │   ├── motores/         sqlite.js y mysql.js
│   │   │   └── tiempo.js        Fechas portables entre motores
│   │   ├── errores/             ErrorValidacion, ErrorNoAutorizado
│   │   ├── middlewares/         Manejador asíncrono y exige sesión
│   │   ├── rutas/               Tabla de rutas de la API REST
│   │   └── modulos/
│   │       ├── autenticacion/    Autenticación (servidor)
│   │       ├── configuracion/    Configuración (servidor)
│   │       ├── ejercicios/       Ejercicios (servidor)
│   │       └── acceso-a-datos/   Acceso a datos (servidor)
│   ├── pruebas/api.test.js       22 pruebas automáticas (node:test)
│   ├── datos/eybrek.db           La base de datos SQLite (se crea sola)
│   └── .env.example              Plantilla de configuración
│
├── client/                      Cliente de escritorio (Electron)
│   ├── src/
│   │   ├── main.js               Proceso principal: ventanas, IPC, observador
│   │   ├── preload.js            Puente seguro entre procesos
│   │   ├── config.json           Direcciones del servidor
│   │   ├── compartido/           Código compartido entre proceso y renderer
│   │   ├── modulos/
│   │   │   ├── comunicacion/     Comunicación, copia local, bitácora
│   │   │   ├── temporizador/     Temporizador (patrón Observer)
│   │   │   ├── bloqueo/          Bloqueo de pantalla
│   │   │   └── interfaz/         Avisos del sistema
│   │   └── renderer/             Interfaz de usuario (HTML + CSS + JS)
│   ├── assets/gato-mimido.png    Elemento gráfico del prototipo
│   ├── capturar.js               Utilidad para capturar las pantallas
│   └── diagnosticar.js           Utilidad para inspeccionar el DOM
│
└── docs/
    ├── imagenes/                 Capturas de las pantallas
    ├── documento/                El documento de diseño del corte
    ├── modelo-er.md              Diagrama entidad-relación (Mermaid)
    ├── manual-usuario.md         Manual de uso e instalación
    └── pruebas/
        ├── verificar-api.ps1     Verificación de la API (25 comprobaciones)
        └── acta-de-pruebas.md    Registro de pruebas por requisito
```

---

## 4. Módulos del sistema

El código respeta los ocho módulos de la sección 4.6 del documento de diseño.

| Módulo | Dónde | Responsabilidad |
|---|---|---|
| Interfaz de usuario (cliente) | `client/src/renderer/` | Mostrar las pantallas y recibir lo que escribe el usuario |
| Comunicación y copia local (cliente) | `client/src/modulos/comunicacion/` | Hablar con el servidor y guardar la copia local |
| Temporizador (cliente) | `client/src/modulos/temporizador/` | Contar el intervalo y verificar el horario |
| Bloqueo de pantalla (cliente) | `client/src/modulos/bloqueo/` | Bloquear, mostrar la hora y el ejercicio, desbloquear |
| Autenticación (servidor) | `server/src/modulos/autenticacion/` | Registrar, iniciar y cerrar sesión |
| Configuración (servidor) | `server/src/modulos/configuracion/` | Guardar, leer y validar la configuración |
| Ejercicios (servidor) | `server/src/modulos/ejercicios/` | Entregar el siguiente ejercicio de la rotación |
| Acceso a datos (servidor) | `server/src/modulos/acceso-a-datos/` | Leer y escribir en la base de datos |

**Patrón Observer:** el Temporizador emite los eventos `avisoProximo` y
`bloquear`, y la Interfaz y el Bloqueo de pantalla se suscriben sin conocerse.

---

## 5. API REST

| Método | Ruta | Requisitos | Módulo |
|---|---|---|---|
| GET | `/api/salud` | — | Comprobación de disponibilidad |
| POST | `/api/auth/registro` | RF-01, RF-02, RF-12 | Autenticación |
| POST | `/api/auth/iniciar-sesion` | RF-03, RF-14 | Autenticación |
| POST | `/api/auth/cerrar-sesion` | RF-04 | Autenticación |
| GET | `/api/auth/sesion` | RF-14 | Autenticación |
| GET | `/api/configuracion` | RF-13, RF-14 | Configuración |
| PUT | `/api/configuracion` | RF-10, RF-11, RF-13 | Configuración |
| GET | `/api/ejercicios` | RNF-07 | Ejercicios |
| GET | `/api/ejercicios/siguiente` | RF-20, RF-21 | Ejercicios |

Las respuestas usan siempre la misma forma:

```json
{ "ok": true,  "mensaje": "...", "datos": { } }
{ "ok": false, "error": "mensaje para el usuario" }
```

La autenticación se hace con el token en la cabecera `Authorization: Bearer`.

---

## 6. Los tres modos de conexión

### Modo 1 — Cada quien con su propio servidor (el más simple)

Cada equipo corre su propio servidor. Todo es local, funciona sin internet
y no depende de nadie.

1. Instalar Node.js.
2. `npm install` en `server/` y en `client/`.
3. `npm start` en `server/` → la base de datos se crea sola.
4. `npm start` en `client/`.
5. Registrarse con un correo propio.

**No hay nada que configurar.** El cliente detecta solo que el servidor está
en este equipo.

### Modo 2 — Un servidor para todo el equipo

Un solo equipo levanta el servidor y los demás solo instalan el cliente.

1. En el equipo del servidor: `npm start` en la carpeta `server/`.
2. En cada equipo cliente: copiar la carpeta `client/` y ejecutar
   `npm start`.
3. La dirección del servidor está en `client/src/config.json`:

   ```json
   {
     "servidorUrl": "http://DESKTOP-CTLL6OH:3000/api",
     "servidorUrlAlternativo": "http://127.0.0.1:3000/api",
     "servidorUrlRespaldo": "http://192.168.0.12:3000/api"
   }
   ```

   Se usa el **nombre del equipo** y no la IP, porque el nombre se resuelve
   en la red local y no cambia cuando el router renueva la dirección IP.
   La IP queda como respaldo; si cambia, basta con actualizarla.

4. Cada persona se registra con su propio correo y contraseña. La cuenta
   queda en el servidor del equipo, así que su configuración la acompaña a
   cualquier equipo (RF-14).

**Requisitos:** estar en la misma red y que el equipo del servidor esté
encendido. Si el equipo del servidor no está, el cliente sigue bloqueando
la pantalla con la copia local (RNF-05) y sube los cambios solos cuando el
servidor vuelva.

### Modo 3 — Redes distintas (punto de acceso móvil)

Si los equipos no están en la misma red:

1. En el equipo del servidor, active **Configuración → Red e Internet →
   Punto de acceso móvil** (Windows 10 y 11).
2. El otro equipo se conecta a ese punto de acceso.
3. En `client/src/config.json`, ponga la dirección del punto de acceso:
   `http://192.168.137.1:3000/api`.

Para presentar la aplicación en un lugar sin ninguna de estas redes, use el
**Modo 1**: cada quien lleva su propio servidor.

---

## 7. Pruebas

```powershell
# Pruebas automáticas del servidor (22 casos)
cd EyBrek\server
npm run pruebas

# Pruebas del temporizador del cliente (8 casos)
cd ..\client
npm run pruebas

# Verificación completa de la API contra el servidor en marcha (25 comprobaciones)
powershell -ExecutionPolicy Bypass -File docs\pruebas\verificar-api.ps1
```

El registro de resultados por requisito está en
[`docs/pruebas/acta-de-pruebas.md`](docs/pruebas/acta-de-pruebas.md).

Las pruebas corren con el motor que esté configurado. Para probarlos con
MySQL:

```powershell
$env:DB_MOTOR='mysql'; $env:DB_USER='eybrek'; $env:DB_PASSWORD='...'
npm run pruebas
```

---

## 8. Decisiones de implementación

Estas decisiones complementan el documento de diseño:

1. **SQLite como motor por defecto.** La base de datos es un archivo que se
   crea solo, sin instalar MySQL, sin crear usuarios y sin contraseñas. MySQL
   sigue disponible (`DB_MOTOR=mysql`) para quien quiera una base central.
   Los dos motores están detrás del módulo *Acceso a datos*, que es
   justamente el módulo que el documento define como responsible de ocultar
   la conexión. El modelo de datos es idéntico en los dos casos.
2. **Inicio del conteo del intervalo (RF-16).** El conteo arranca en el
   instante más tardío entre el inicio de la ventana de horario y el inicio
   de la sesión. Así, quien inicia sesión a las 2 de la tarde con un intervalo
   de 2 horas recibe su primer bloqueo a las 4 de la tarde, y nunca se
   bloquea fuera del horario configurado.
3. **Catálogo de ejercicios.** Se implementaron los 4 ejercicios de la Figura
   7 del documento. La Figura 6 muestra otro juego de nombres; como el
   catálogo es una tabla (RNF-07), agregar o renombrar ejercicios es un
   `INSERT` o un `UPDATE` sin tocar el código.
4. **Rotación dentro del bloqueo (RF-21).** La rotación avanza un ejercicio
   por bloqueo, como está especificado. El temporizador de 20 segundos de la
   Figura 7 funciona como guía de ritmo del ejercicio y se reinicia al
   terminar, para que el usuario pueda repetirlo durante toda la pausa.
5. **Botón «Ver la pantalla de descanso».** Es una ayuda para demostrar la
   aplicación sin esperar a que se cumpla el intervalo. Usa exactamente el
   mismo camino de código que el temporizador.
6. **Interruptor «Consejos en pantalla».** Es una preferencia local de la
   pantalla; no se guarda en el servidor porque no corresponde a ningún
   requisito funcional.
7. **Ruta `GET /api/ejercicios`.** Se añadió para poder mostrar la lista
   completa de ejercicios de la Figura 7. No consume el avance de la rotación.
8. **Detección del servidor.** El cliente prueba las direcciones configuradas
   al arrancar, se queda con la que responde y la recuerda. No hay que
   configurar nada y la aplicación no se queda esperando cuando un servidor
   no existe.
9. **Interfaz sin mensajes de estado.** La aplicación solo habla cuando el
   usuario hace algo y hay que responderle (una contraseña incorrecta, un
   valor fuera de rango, la confirmación de que se guardó). Nunca anuncia
   su propio estado, como pide la sección 4.8 del documento.
10. **Bloqueo de pantalla.** La ventana de bloqueo es de pantalla completa, sin
    marco, siempre encima (`screen-saver`) y sin botón de cerrar, pero
    Windows permite siempre abrir el Administrador de tareas o usar
    `Ctrl + Alt + Del`. Esta limitación ya está reconocida en las secciones
    4.9 y 4.10 del documento.
11. **Todas las pantallas.** El descanso cubre cada monitor conectado (y los
    que se conecten durante la pausa). La pantalla principal muestra el
    ejercicio; las demás, solo el descanso.
12. **Sin salidas durante el descanso.** Mientras dura la pausa, y en el
    minuto previo, la bandeja no permite «Salir» ni «Cerrar sesión», y la
    aplicación ignora los intentos de cerrarse. Solo el proceso principal
    decide cuándo termina el bloqueo; la ventana de descanso usa su propio
    preload, con acceso únicamente a sus datos.
13. **Arranque con Windows.** EyBrek se registra para iniciar con la sesión
    de Windows (oculto en la bandeja). Se puede desactivar poniendo
    `"iniciarConWindows": false` en `ajustes-local.json`.
14. **Ausencias cuentan como descanso.** Si el equipo estuvo sin uso,
    suspendido o con la sesión de Windows bloqueada al menos lo que dura un
    descanso, el conteo del intervalo vuelve a empezar en lugar de bloquear
    apenas la persona regresa.
15. **Ejercicios guiados.** Durante la pausa los ejercicios avanzan uno a uno
    (30 s cada uno), empezando por el que toca en la rotación. Sin servidor,
    la rotación sigue en el equipo con el catálogo guardado.
16. **Seguridad de la API.** Las sesiones duran 90 días (`SESION_DIAS`), en la
    base se guarda el hash SHA-256 del token, el token solo se acepta en la
    cabecera `Authorization`, el inicio de sesión se bloquea 15 min tras 10
    intentos fallidos y la contraseña mínima es de 8 caracteres.

---

## 9. Archivos que guarda el cliente

En la carpeta de datos de la aplicación (`%APPDATA%\eybrek-client`):

| Archivo | Contenido |
|---|---|
| `sesion-local.json` | Token y datos del usuario de la sesión activa |
| `config-local.json` | Copia local de la configuración (RF-15) |
| `ejercicio-local.json` | Último ejercicio mostrado (para usar sin servidor) |
| `ajustes-local.json` | Preferencias locales y dirección del servidor detectada |
| `eybrek.log` | Bitácora de la aplicación |

---

## 10. Referencias del proyecto

- Documento de diseño: [`docs/documento/EyBrek_3_SegundoCorte.docx`](docs/documento/).
- ISO/IEC/IEEE 29148:2018 — *Systems and software engineering: Life cycle
  processes: Requirements engineering.*
- Gamma, E., Helm, R., Johnson, R. y Vlissides, J. (1994). *Design Patterns:
  Elements of Reusable Object-Oriented Software.* Addison-Wesley.
