# =====================================================================
# EyBrek - Verificacion de la API del servidor
# Ejecuta el recorrido completo contra el servidor y muestra el
# resultado de cada prueba (requisito, operacion y resultado esperado).
#
# Uso:  powershell -ExecutionPolicy Bypass -File verificar-api.ps1
#        powershell -ExecutionPolicy Bypass -File verificar-api.ps1 -Base "http://192.168.137.34:3000/api"
# =====================================================================

param(
  [string]$Base = "http://127.0.0.1:3000/api"
)

$ErrorActionPreference = 'Continue'
$global:aprobadas = 0
$global:fallidas = 0

function Titulo($texto) {
  Write-Host ""
  Write-Host "== $texto" -ForegroundColor Cyan
}

function Verificar($descripcion, $condicion, $detalle = '') {
  if ($condicion) {
    $global:aprobadas++
    Write-Host ("  [OK]   {0} {1}" -f $descripcion, $detalle) -ForegroundColor Green
  } else {
    $global:fallidas++
    Write-Host ("  [FALLA] {0} {1}" -f $descripcion, $detalle) -ForegroundColor Red
  }
}

function Peticion($metodo, $ruta, $cuerpo = $null, $token = $null) {
  $parametros = @{
    Uri             = "$Base$ruta"
    Method          = $metodo
    TimeoutSec      = 15
    ErrorAction     = 'Stop'
  }
  if ($cuerpo) {
    $parametros['ContentType'] = 'application/json'
    $parametros['Body'] = ($cuerpo | ConvertTo-Json -Depth 6)
  }
  if ($token) {
    $parametros['Headers'] = @{ Authorization = "Bearer $token" }
  }
  try {
    $respuesta = Invoke-RestMethod @parametros
    return @{ ok = $true; cuerpo = $respuesta }
  } catch {
    $codigo = $null
    if ($_.Exception.Response) { $codigo = [int]$_.Exception.Response.StatusCode }
    $mensaje = $_.ErrorDetails.Message
    if (-not $mensaje) { $mensaje = $_.Exception.Message }
    return @{ ok = $false; codigo = $codigo; mensaje = $mensaje }
  }
}

# ---------------------------------------------------------------------
Titulo "0. Disponibilidad del servidor"
$salud = Peticion 'GET' '/salud'
Verificar "GET /api/salud responde" $salud.ok "($Base)"
if (-not $salud.ok) { Write-Host "El servidor no esta disponible. Abortando." -ForegroundColor Red; exit 1 }

$correo = "verificacion$(Get-Random -Maximum 999999)@eybrek.com"
$clave  = 'clave12345'

# ---------------------------------------------------------------------
Titulo "1. Registro de cuenta (RF-01, RF-02, RF-12)"
$registro = Peticion 'POST' '/auth/registro' @{ nombre = 'Usuario de Verificacion'; correo = $correo; contrasena = $clave }
Verificar "Registro de cuenta nueva" $registro.ok $registro.mensaje

$duplicado = Peticion 'POST' '/auth/registro' @{ nombre = 'Repetido'; correo = $correo; contrasena = $clave }
Verificar "Rechaza correo ya registrado (RF-02)" ($duplicado.codigo -eq 400) "(codigo $($duplicado.codigo))"

$correoMalo = Peticion 'POST' '/auth/registro' @{ nombre = 'Correo Malo'; correo = 'esto-no-es-correo'; contrasena = $clave }
Verificar "Rechaza formato de correo invalido (RF-02)" ($correoMalo.codigo -eq 400) "(codigo $($correoMalo.codigo))"

# ---------------------------------------------------------------------
Titulo "2. Inicio de sesion (RF-03)"
$login = Peticion 'POST' '/auth/iniciar-sesion' @{ correo = $correo; contrasena = $clave }
Verificar "Inicio de sesion correcto" ($login.ok -and $login.cuerpo.datos.token) ""
$token = $login.cuerpo.datos.token

$claveMala = Peticion 'POST' '/auth/iniciar-sesion' @{ correo = $correo; contrasena = 'incorrecta' }
Verificar "Rechaza contrasena incorrecta" ($claveMala.codigo -eq 401) "(codigo $($claveMala.codigo))"

# ---------------------------------------------------------------------
Titulo "3. Configuracion por defecto (RF-12)"
$config = Peticion 'GET' '/configuracion' $null $token
$valores = $config.cuerpo.datos.configuracion
Verificar "Devuelve la configuracion del usuario" ($config.ok) ""
Verificar "Bloqueo activado por defecto" ($valores.bloqueo_activo -eq $true) ""
Verificar "Intervalo de 2 horas (120 min)" ($valores.intervalo_minutos -eq 120) "(valor $($valores.intervalo_minutos))"
Verificar "Duracion de 15 minutos" ($valores.duracion_minutos -eq 15) "(valor $($valores.duracion_minutos))"
Verificar "Horario de 08:00 a 21:00" ($valores.hora_inicio -eq '08:00' -and $valores.hora_fin -eq '21:00') "($($valores.hora_inicio) - $($valores.hora_fin))"
Verificar "Notificaciones activadas por defecto" ($valores.notificaciones_activas -eq $true) ""

# ---------------------------------------------------------------------
Titulo "4. Validacion de la configuracion (RF-10, RF-11)"
$guardar = Peticion 'PUT' '/configuracion' @{ bloqueo_activo = $true; intervalo_minutos = 30; duracion_minutos = 5; hora_inicio = '08:00'; hora_fin = '21:00'; notificaciones_activas = $true } $token
Verificar "Guarda configuracion valida" ($guardar.ok) ""

$releer = Peticion 'GET' '/configuracion' $null $token
Verificar "La configuracion persistio en el servidor (RF-13)" ($releer.cuerpo.datos.configuracion.intervalo_minutos -eq 30) "(valor $($releer.cuerpo.datos.configuracion.intervalo_minutos))"

$casosInvalidos = @(
  @{ n = 'Intervalo menor a 15 minutos'; c = @{ bloqueo_activo = $true; intervalo_minutos = 5; duracion_minutos = 5; hora_inicio = '08:00'; hora_fin = '21:00'; notificaciones_activas = $true } },
  @{ n = 'Intervalo mayor a 8 horas';     c = @{ bloqueo_activo = $true; intervalo_minutos = 600; duracion_minutos = 5; hora_inicio = '08:00'; hora_fin = '21:00'; notificaciones_activas = $true } },
  @{ n = 'Duracion mayor a 30 minutos';   c = @{ bloqueo_activo = $true; intervalo_minutos = 120; duracion_minutos = 45; hora_inicio = '08:00'; hora_fin = '21:00'; notificaciones_activas = $true } },
  @{ n = 'Duracion mayor o igual al intervalo'; c = @{ bloqueo_activo = $true; intervalo_minutos = 30; duracion_minutos = 30; hora_inicio = '08:00'; hora_fin = '21:00'; notificaciones_activas = $true } }
)
foreach ($caso in $casosInvalidos) {
  $resultado = Peticion 'PUT' '/configuracion' $caso.c $token
  Verificar "Rechaza: $($caso.n) (RF-11)" ($resultado.codigo -eq 400) "-> $($resultado.mensaje)"
}

# ---------------------------------------------------------------------
Titulo "5. Catalogo y rotacion de ejercicios (RF-20, RF-21)"
$catalogo = Peticion 'GET' '/ejercicios' $null $token
Verificar "Catalogo de ejercicios disponible" ($catalogo.ok -and $catalogo.cuerpo.datos.ejercicios.Count -gt 0) "($($catalogo.cuerpo.datos.ejercicios.Count) ejercicios)"

$total = $catalogo.cuerpo.datos.ejercicios.Count
$titulos = @()
1..$total | ForEach-Object {
  $siguiente = Peticion 'GET' '/ejercicios/siguiente' $null $token
  $titulos += $siguiente.cuerpo.datos.ejercicio.titulo
}
Verificar "La rotacion recorre el catalogo en orden" (($titulos -join '|') -eq (($catalogo.cuerpo.datos.ejercicios | ForEach-Object { $_.titulo }) -join '|')) "($($titulos -join ' -> '))"

$repetido = Peticion 'GET' '/ejercicios/siguiente' $null $token
Verificar "La rotacion vuelve al primer ejercicio al terminar (RF-21)" ($repetido.cuerpo.datos.ejercicio.posicion -eq 1) "(posicion $($repetido.cuerpo.datos.ejercicio.posicion))"

# ---------------------------------------------------------------------
Titulo "6. Control de sesion (RF-04, RF-24)"
$sinToken = Peticion 'GET' '/configuracion'
Verificar "Rechaza peticion sin token" ($sinToken.codigo -eq 401) "(codigo $($sinToken.codigo))"

$tokenFalso = Peticion 'GET' '/configuracion' $null 'token-inventado'
Verificar "Rechaza token invalido" ($tokenFalso.codigo -eq 401) "(codigo $($tokenFalso.codigo))"

$cerrar = Peticion 'POST' '/auth/cerrar-sesion' $null $token
Verificar "Cierra la sesion (RF-04)" $cerrar.ok ""

$despues = Peticion 'GET' '/configuracion' $null $token
Verificar "El token deja de servir despues de cerrar sesion" ($despues.codigo -eq 401) "(codigo $($despues.codigo))"

# ---------------------------------------------------------------------
Write-Host ""
Write-Host "=============================================" -ForegroundColor DarkCyan
Write-Host (" Pruebas aprobadas: {0}" -f $global:aprobadas) -ForegroundColor Green
if ($global:fallidas -gt 0) {
  Write-Host (" Pruebas fallidas:  {0}" -f $global:fallidas) -ForegroundColor Red
} else {
  Write-Host " Pruebas fallidas:  0" -ForegroundColor Green
}
Write-Host "=============================================" -ForegroundColor DarkCyan

# ---------------------------------------------------------------------
# Limpieza: se borra la cuenta de prueba para no dejar basura.
# ---------------------------------------------------------------------
Push-Location (Join-Path $PSScriptRoot '..\..\server')
try {
  node -e "const u=require('./src/modulos/acceso-a-datos/usuarios');const db=require('./src/db/conexion');(async()=>{await db.iniciar();const x=await u.leerPorCorreo(process.argv[1]);if(x){await u.eliminar(x.id_usuario);}await db.cerrar();})();" $correo 2>$null
} finally {
  Pop-Location
}

if ($global:fallidas -gt 0) { exit 1 }
