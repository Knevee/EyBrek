# EyBrek — Servidor en la nube (Supabase) e instalador

Con estos dos pasos EyBrek funciona como cualquier aplicación: se instala con
doble clic, aparece en el escritorio y en el menú Inicio, y la cuenta de cada
persona vive en la nube, así que su configuración la acompaña a cualquier
equipo con internet (RF-14). Nadie tiene que dejar un servidor encendido.

---

## 1. Crear el servidor en Supabase (una sola vez)

1. Entra a <https://supabase.com>, crea una cuenta y un proyecto nuevo
   (plan gratuito). Elige la región más cercana (por ejemplo *São Paulo*).
2. En el proyecto abre **SQL Editor → New query**, pega todo el archivo
   [`supabase/esquema.sql`](../supabase/esquema.sql) y presiona **Run**.
   Se crean las tablas, el catálogo de 4 ejercicios, la rotación y las
   reglas de seguridad. Se puede ejecutar de nuevo sin perder datos.
3. En **Authentication → Sign In / Providers → Email**:
   - **Confirm email**: desactívalo si quieres que la cuenta sirva apenas se
     crea. Si lo dejas activo, cada persona debe confirmar su correo antes
     de iniciar sesión (la app se lo indica).
   - **Minimum password length**: pon **8**, igual que la app.
4. En **Project Settings → API** copia:
   - **Project URL** (por ejemplo `https://abcd1234.supabase.co`)
   - **anon public key** (la clave pública; *no* la `service_role`)

## 2. Conectar el cliente

Edita [`client/src/config.json`](../client/src/config.json):

```json
{
  "modo": "supabase",
  "supabaseUrl": "https://abcd1234.supabase.co",
  "supabaseAnonKey": "eyJhbGciOi..."
}
```

- La clave **anon** es pública por diseño: va dentro de la aplicación. Lo que
  protege los datos son las políticas de seguridad por fila (RLS) del
  esquema: cada persona solo puede leer y cambiar su propia configuración.
- **Nunca** pongas la clave `service_role` en el cliente.
- Para volver al servidor propio de la red local, usa `"modo": "local"`.

## 3. Crear el instalador

```powershell
cd EyBrek\client
npm install
npm run empaquetar
```

El resultado es `client\dist\EyBrek-Instalador-1.0.0.exe`. Ese único archivo
es lo que se comparte: al abrirlo, EyBrek se instala para el usuario (sin
pedir permisos de administrador), crea los accesos directos y se abre.

- `config.json` queda **dentro** del instalador. Si cambias la dirección o la
  clave de Supabase, vuelve a ejecutar `npm run empaquetar`.
- Para probar sin instalar: `npm run empaquetar:carpeta` y abre
  `client\dist\win-unpacked\EyBrek.exe`.
- Al ser un instalador sin firma digital, Windows puede mostrar «Windows
  protegió su PC». Se continúa con **Más información → Ejecutar de todas
  formas**. Firmarlo requiere un certificado de firma de código (de pago).
- Para desinstalar: **Configuración → Aplicaciones → EyBrek → Desinstalar**.
  La configuración local se conserva en `%APPDATA%\EyBrek`.

## 4. Cómo corresponde con el diseño

Solo cambió el módulo **Comunicación y copia local** del cliente, que ahora
tiene dos proveedores con las mismas operaciones
(`servidor-local.js` y `supabase.js`). El Temporizador, el Bloqueo de pantalla
y la Interfaz no cambiaron, y la copia local sigue permitiendo bloquear sin
internet (RNF-05). Esto confirma el bajo acoplamiento descrito en la sección
4.6 del documento de diseño.

| Módulo del servidor (diseño) | Servidor local | Supabase |
|---|---|---|
| Autenticación | `server/src/modulos/autenticacion` | Supabase Auth (bcrypt, sesiones con renovación automática) |
| Configuración | `server/src/modulos/configuracion` | Tabla `configuracion` con las reglas del RF-11 como restricciones `CHECK` |
| Ejercicios | `server/src/modulos/ejercicios` | Tabla `ejercicio` + función `siguiente_ejercicio()` |
| Acceso a datos | `server/src/modulos/acceso-a-datos` | Postgres con seguridad por fila (RLS) |

Con Supabase la tabla `Sesion` ya no hace falta (Supabase Auth guarda las
sesiones) y la sesión en el equipo se guarda cifrada con el usuario de
Windows (`sesion-supabase.json`).

> **Para el documento del proyecto:** la sección 4.1 deja el despliegue en la
> nube fuera del alcance y la 4.5 describe un servidor propio sin nube. Si
> entregan la versión con Supabase, actualicen esas secciones, la tabla de
> arquitectura y las limitaciones (ya no hay HTTP sin cifrar: Supabase usa
> HTTPS).
