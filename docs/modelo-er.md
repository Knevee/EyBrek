# EyBrek — Modelo de datos

Diagrama entidad-relacion del sistema, generado a partir del esquema
realmente implementado (las 5 tablas de la base de datos).

## Diagrama

```mermaid
erDiagram
    Usuario ||--o{ Sesion : "inicia"
    Usuario ||--|| Configuracion : "tiene"
    Usuario ||--|| ProgresoRotacion : "avanza en"
    Ejercicio ||--o{ ProgresoRotacion : "es ultimo de"

    Usuario {
        int id_usuario PK
        varchar_100 nombre
        varchar_150 correo UK
        varchar_255 contrasena_hash
        datetime fecha_creacion
    }

    Sesion {
        int id_sesion PK
        int id_usuario FK
        varchar_255 token UK
        datetime fecha_inicio
    }

    Configuracion {
        int id_configuracion PK
        int id_usuario FK_UK
        boolean bloqueo_activo
        int intervalo_minutos
        int duracion_minutos
        time hora_inicio
        time hora_fin
        boolean notificaciones_activas
    }

    Ejercicio {
        int id_ejercicio PK
        varchar_100 titulo
        text instrucciones
        int orden UK
    }

    ProgresoRotacion {
        int id_progreso PK
        int id_usuario FK_UK
        int id_ultimo_ejercicio FK
    }
```

## Entidades

| Entidad | Atributos | Descripción |
|---|---|---|
| **Usuario** | `id_usuario` (PK), `nombre`, `correo` (único), `contrasena_hash`, `fecha_creacion` | Cuenta de cada persona. La contraseña se guarda cifrada con hash (RNF-02) |
| **Sesion** | `id_sesion` (PK), `id_usuario` (FK), `token` (único), `fecha_inicio` | Sesión activa de un usuario en un equipo |
| **Configuracion** | `id_configuracion` (PK), `id_usuario` (FK, único), `bloqueo_activo`, `intervalo_minutos`, `duracion_minutos`, `hora_inicio`, `hora_fin`, `notificaciones_activas` | Preferencias de bloqueo del usuario |
| **Ejercicio** | `id_ejercicio` (PK), `titulo`, `instrucciones`, `orden` (único) | Catálogo compartido de ejercicios que se muestran en rotación |
| **ProgresoRotacion** | `id_progreso` (PK), `id_usuario` (FK, único), `id_ultimo_ejercicio` (FK) | Último ejercicio mostrado a cada usuario |

## Relaciones

| Relación | Cardinalidad | Explicación |
|---|---|---|
| Usuario — Sesion | 1 a N | Un usuario puede tener varias sesiones, una por cada equipo |
| Usuario — Configuracion | 1 a 1 | Cada usuario tiene una única configuración |
| Usuario — ProgresoRotacion | 1 a 1 | Cada usuario tiene su propio avance en la rotación |
| ProgresoRotacion — Ejercicio | N a 1 | Varios usuarios pueden estar en el mismo ejercicio |

## Reglas de borrado

| Regla | Entidades |
|---|---|
| `ON DELETE CASCADE` | Sesion, Configuracion, ProgresoRotacion (al borrar un usuario) |
| `ON DELETE SET NULL` | ProgresoRotacion.id_ultimo_ejercicio (al borrar un ejercicio) |

## Ver el diagrama en MySQL Workbench

1. Abra **MySQL Workbench** y conéctese a la instancia local de MySQL.
2. `File` → `New Model` → guárdelo como `EyBrek.mwb`.
3. En el panel **Database Schemas** del modelo: clic derecho → **Add Existing
   Connection** → seleccione la conexión local.
4. Clic derecho en el esquema `eybrek` → **EER Diagram** → **New EER Diagram**.

Si usa SQLite, importe el esquema en lugar de la conexión: `File` →
`Import` → `SQL Script` → `database/01_esquema_mysql.sql`.

## Notas

- La copia local de la configuración (RF-15) **no es una entidad nueva**: es
  un duplicado de `Configuracion` guardado en el equipo del usuario.
- El motor de base de datos (SQLite o MySQL) es un detalle interno del
  módulo *Acceso a datos* (sección 4.6 del documento de diseño). El modelo
  de datos es idéntico en los dos casos.
- Los ejercicios se guardan como datos (RNF-07): agregar o modificar uno es
  un `INSERT` o un `UPDATE`, sin tocar el código.
