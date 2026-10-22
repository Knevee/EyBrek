# EyBrek — Manual de usuario

EyBrek bloquea la pantalla de forma periódica para que tu vista descanse de
verdad. Durante la pausa te muestra un ejercicio visual guiado.

---

## 1. Instalación

### 1.1. Lo único que necesitas

**Node.js 18 o superior**, descargado de <https://nodejs.org>.

No hace falta instalar MySQL, ni Workbench, ni crear usuarios, ni escribir
contraseñas de base de datos: **la base de datos de EyBrek es un archivo que
se crea solo** en el primer arranque.

### 1.2. Puesta en marcha

1. Descarga o copia la carpeta `EyBrek`.
2. Doble clic en **`iniciar-servidor.bat`**. Se abre una ventana de consola
   con el servidor andando. Déjala abierta.
3. Doble clic en **`iniciar-cliente.bat`**. Se abre la aplicación.
4. En la aplicación, presiona **Regístrate** y crea tu cuenta con nombre,
   correo y contraseña (mínimo 6 caracteres).
5. Inicia sesión. EyBrek aplica la **configuración por defecto**: bloqueo
   activado, cada 2 horas, 15 minutos de duración, horario de 8:00 a. m. a
   9:00 p. m. y notificaciones activadas.

> La primera vez, los dos lanzadores instalan las dependencias por su cuenta.
> Puede tardar un momento y necesita conexión a internet.

![Pantalla de inicio de sesión](imagenes/pantalla-inicio-sesion.png)

### 1.3. Si quieres una base de datos MySQL en vez de SQLite

Opcional. Solo tiene sentido si quieres una base de datos **central**
compartida por varias personas. En ese caso:

```powershell
cd EyBrek\database
powershell -ExecutionPolicy Bypass -File instalar-base-datos.ps1
```

El script te pide la contraseña de root de MySQL (la que pusiste al instalar
MySQL Server), te pide o te genera la contraseña del usuario de la
aplicación, crea la base con sus tablas y escribe el archivo `server/.env`.
La contraseña **no queda guardada en ningún archivo del repositorio**.

---

## 2. Configuración

![Pantalla de configuración](imagenes/pantalla-configuracion.png)

| Opción | Qué hace | Valores permitidos |
|---|---|---|
| **Activar bloqueo** | Activa o desactiva el bloqueo de pantalla. | Encendido / Apagado |
| **Bloquear cada** | Cada cuánto se activa el descanso. | 15 y 30 minutos, 1, 2, 4 u 8 horas |
| **Tiempo de bloqueo** | Cuánto dura la pausa. | 5, 10, 15, 20 o 30 minutos |
| **Horario** | Rango del día en que se activa el bloqueo. | Cualquier hora del día |
| **Notificaciones** | Avisa un minuto antes del descanso. | Encendido / Apagado |
| **Consejos en pantalla** | Muestra consejos de salud visual durante la pausa. | Encendido / Apagado |

**Reglas que valida la aplicación:**

- El intervalo debe estar entre **15 minutos y 8 horas**.
- La duración debe estar entre **1 y 30 minutos**.
- La duración debe ser **menor** que el intervalo.
- La hora de fin debe ser distinta de la hora de inicio.

Si escribes un valor no permitido, la aplicación te dice exactamente cuál es el
rango correcto y **no** guarda el cambio.

Cuando presionas **Guardar cambios** aparece un mensaje de confirmación. La
configuración queda guardada en el servidor y también en una copia local del
equipo.

**Ver la pantalla de descanso** abre la pausa inmediatamente, sin esperar a
que se cumpla el intervalo. Sirve para comprobar cómo se ve y para presentar
la aplicación.

---

## 3. La pausa

Cuando se cumple el intervalo, la pantalla se bloquea:

![Pantalla de bloqueo](imagenes/pantalla-bloqueo.png)

- **A la izquierda** verás la hora actual, la hora en que termina el descanso
  y cuánto falta para desbloquearte.
- **A la derecha** está el ejercicio de la vista: su nombre, las instrucciones
  y el temporizador de 20 segundos que marca el ritmo.
- Debajo está la lista de los 4 ejercicios del catálogo; el que estás haciendo
  aparece resaltado.

La pausa **no se puede omitir**. Cuando termina el tiempo configurado, la
pantalla se desbloquea sola y el conteo del intervalo empieza de nuevo.

Un minuto antes de cada pausa recibes una notificación del sistema.

---

## 4. La rotación de ejercicios

Los 4 ejercicios se turnan: en la primera pausa ves «Cerca y lejos», en la
segunda «Parpadeo», en la tercera «En círculos», en la cuarta «Palmas» y
después vuelve a empezar con el primero. El avance se guarda por usuario en
el servidor, así que cada persona tiene su propia rotación.

---

## 5. Trabajar en equipo

### Un servidor para todos (recomendado si están en la misma red)

1. Una persona levanta el servidor en su equipo: `iniciar-servidor.bat`.
2. Las demás copian la carpeta `client/` y ejecutan `iniciar-cliente.bat`.
3. Las demás se registran con su propio correo y contraseña.

Cada persona tiene su cuenta en el servidor del equipo, así que su
configuración la acompaña a cualquier equipo. Para saber a qué dirección
apunta el cliente, mire `client/src/config.json`:

```json
{
  "servidorUrl": "http://DESKTOP-CTLL6OH:3000/api",
  "servidorUrlAlternativo": "http://127.0.0.1:3000/api",
  "servidorUrlRespaldo": "http://192.168.0.12:3000/api"
}
```

Se usa el **nombre del equipo** y no la dirección IP, porque el nombre se
resuelve dentro de la red local y no cambia cuando el router le renueva la
IP. Si cambia, actualice la línea `servidorUrlRespaldo`.

### Si no están en la misma red

En el equipo del servidor, active **Configuración → Red e Internet → Punto de
acceso móvil** (Windows 10 y 11). Los demás se conectan a ese punto de acceso
y en `config.json` ponen la dirección `http://192.168.137.1:3000/api`.

### Si el servidor no está disponible

**La aplicación sigue funcionando igual.** Usa la copia local de tu
configuración y sigue bloqueando la pantalla. Los cambios que guardes durante
ese tiempo se suben solos al servidor en cuanto vuelva. No se muestra ningún
aviso: la aplicación simplemente funciona.

---

## 6. Cerrar sesión y salir

- **Cerrar sesión** (barra lateral o bandeja del sistema) cierra la sesión en
  el servidor y detiene el conteo. Vuelve a la pantalla de acceso.
- Si cierras la ventana con la **X** mientras tienes una sesión abierta, EyBrek
  sigue funcionando en segundo plano. Para volver a la ventana, haga doble
  clic en el icono de EyBrek en la bandeja del sistema.
- Para salir por completo: clic derecho en el icono de la bandeja → **Salir**.

---

## 7. Problemas frecuentes

**"No se pudo conectar con el servidor de EyBrek".**
Ocurre al iniciar sesión si no hay ningún servidor al alcance. Si su equipo
tiene el suyo, abra `iniciar-servidor.bat`. Si comparte el de otra persona,
revise que la dirección de `config.json` sea la correcta y que ambos estén
en la misma red.

**La pantalla se bloquea a destiempo.**
El bloqueo ocurre con una desviación máxima de 2 segundos (RNF-03). Si el
equipo está muy cargado o hay muchos procesos, puede demorarse un poco más.

**Olvidé la contraseña.**
La recuperación de contraseña está fuera del alcance de esta versión. Cree
una cuenta nueva con otro correo.

**Quiero cambiar los ejercicios.**
Los ejercicios son datos, no código (RNF-07). En SQLite, abra el archivo
`server/datos/eybrek.db` con cualquier editor de SQLite; en MySQL, edite la
tabla `Ejercicio` en MySQL Workbench. Reinicie el servidor después.

**Quiero reiniciar la rotación de ejercicios.**
Cada bloqueo avanza un ejercicio. Para volver al primero, borre la fila de la
tabla `ProgresoRotacion` del usuario (en SQLite: `DELETE FROM ProgresoRotacion
WHERE id_usuario = <id>;`).

**Quiero saber qué está pasando.**
La bitácora de la aplicación está en `%APPDATA%\eybrek-client\eybrek.log`.
