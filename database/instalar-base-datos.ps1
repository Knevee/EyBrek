# =====================================================================
#  EyBrek - Instalador de la base de datos MySQL (OPCIONAL)
#
#  El servidor de EyBrek usa SQLite por defecto: la base de datos es un
#  archivo que se crea solo, sin instalar MySQL, sin usuarios y sin
#  contrasenas.  Si ya corriste "iniciar-servidor.bat", no necesitas
#  nada de este script.
#
#  Use este script solo si quiere MySQL, por ejemplo para tener una base
#  de datos central compartida por todo el equipo.
#
#  Uso:  powershell -ExecutionPolicy Bypass -File instalar-base-datos.ps1
# =====================================================================

param(
  [string]$HostMySQL = 'localhost',
  [int]$PuertoMySQL = 3306,
  [string]$BaseDatos = 'eybrek',
  [string]$UsuarioApp = 'eybrek'
)

$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $MyInvocation.MyCommand.Path
$archivos = Join-Path (Split-Path -Parent $raiz) 'database'

function Escribir([string]$texto, [string]$color = 'Gris') {
  Write-Host $texto -ForegroundColor $color
}

function Titulo([string]$texto) {
  Write-Host ''
  Write-Host "== $texto" -ForegroundColor Cyan
}

# ---------------------------------------------------------------------
Titulo "1. Buscando MySQL"
# ---------------------------------------------------------------------

$rutasMySQL = @(
  "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
  "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe",
  "C:\xampp\mysql\bin\mysql.exe"
)

$mysql = $rutasMySQL | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $mysql) {
  Escribir ''
  Escribir '  MySQL Server no esta instalado en este equipo.' -ForegroundColor Yellow
  Escribir ''
  Escribir '  No hay problema: EyBrek usa SQLite por defecto y la base de datos'
  Escribir '  se crea sola, sin contrasenas y sin instalar nada.'
  Escribir ''
  Escribir '  Para empezar ahora mismo, cierre esta ventana y ejecute'
  Escribir '  "iniciar-servidor.bat".' -ForegroundColor Green
  Escribir ''
  exit 0
}

Escribir "  Cliente encontrado: $mysql"

# ---------------------------------------------------------------------
Titulo "2. Comprobando el servicio"
# ---------------------------------------------------------------------

$servicio = Get-Service -Name 'MySQL*' -ErrorAction SilentlyContinue | Select-Object -First 1

if ($servicio) {
  Escribir "  Servicio: $($servicio.Name) ($($servicio.Status))"

  if ($servicio.Status -ne 'Running') {
    Escribir '  Arrancando el servicio...'
    Start-Service -Name $servicio.Name
    Start-Sleep -Seconds 3
  }
} else {
  Escribir '  No se encontro el servicio de MySQL: se intentara anyways.' -ForegroundColor Yellow
}

# ---------------------------------------------------------------------
Titulo "3. Autenticacion"
# ---------------------------------------------------------------------

# El almacen de credenciales de MySQL permite entrar sin escribir la
# contrasena cada vez (se crea con: mysql_config_editor set ...).
$editor = Join-Path (Split-Path $mysql) 'mysql_config_editor.exe'
$loginPath = $null

if (Test-Path $editor) {
  $guardadas = & $editor print --all 2>$null | Out-String
  if ($guardadas -match 'login_path\s*=\s*(\S+)') {
    $loginPath = $Matches[1]
    Escribir "  Credenciales guardadas encontradas: $loginPath" -ForegroundColor Green
  }
}

$claveRoot = $null

if ($loginPath) {
  $argumentos = @("-u", $UsuarioApp, "--login-path=$loginPath")
} else {
  Escribir ''
  Escribir '  MySQL necesita la contrasena de root (la que puso al instalar'
  Escribir '  MySQL Server). Se usa solo en esta ejecucion: no se guarda en'
  Escribir '  ningun archivo.'
  Escribir ''

  $seguro = Read-Host '  Contrasena de root' -AsSecureString
  $claveRoot = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($seguro)
  )

  if ([string]::IsNullOrWhiteSpace($claveRoot)) {
    Escribir '  Contrasena vacia. Se cancela.' -ForegroundColor Red
    exit 1
  }

  $env:MYSQL_PWD = $claveRoot
  $argumentos = @("-u", "root")
}

# ---------------------------------------------------------------------
Titulo "4. Comprobando la conexion"
# ---------------------------------------------------------------------

$salida = & $mysql @argumentos "--connect-timeout=8" -e "SELECT VERSION();" 2>&1 | Out-String

if ($LASTEXITCODE -ne 0) {
  Escribir ''
  Escribir "  No se pudo conectar con MySQL:" -ForegroundColor Red
  Escribir "  $($salida.Trim())" -ForegroundColor Red
  Escribir ''
  Escribir '  Si no recuerda la contrasena de root, puede restablecerla con el'
  Escribir '  instalador de MySQL (busque "MySQL Installer" en el menu Inicio).'
  Escribir '  O puede usar SQLite, que no necesita contrasena ninguna.'
  exit 1
}

Escribir '  Conexion correcta.' -ForegroundColor Green

# ---------------------------------------------------------------------
Titulo "5. Contrasena del usuario de la aplicacion"
# ---------------------------------------------------------------------

Escribir ''
Escribir '  El servidor de EyBrek no usa root: usa un usuario propio que solo'
Escribir '  puede ver la base "eybrek". Elija la contrasena de ese usuario.'
Escribir ''

$claveApp = Read-Host '  Contrasena para el usuario de EyBrek' -AsSecureString
$claveAppPlana = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
  [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($claveApp)
)

if ([string]::IsNullOrWhiteSpace($claveAppPlana)) {
  # Si no escribe nada, se genera una contrasena segura.
  $bytes = New-Object byte[] 20
  [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
  $claveAppPlana = [Convert]::ToBase64String($bytes).Replace('+', '').Replace('/', '').Substring(0, 20)
  Escribir "  Se genero una contrasena automatica." -ForegroundColor Green
}

# Se escapan las comillas simples para poder incrustarla en el SQL.
$claveSql = $claveAppPlana.Replace("'", "''")

# ---------------------------------------------------------------------
Titulo "6. Creando la base de datos"
# ---------------------------------------------------------------------

$sql = @"
CREATE DATABASE IF NOT EXISTS ``$BaseDatos`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ``$BaseDatos``;
"@

# El esquema y los datos iniciales se anaden al final.
$sql += (Get-Content (Join-Path $archivos '01_esquema_mysql.sql') -Raw)
$sql += (Get-Content (Join-Path $archivos '02_datos_iniciales.sql') -Raw)

# El usuario de la aplicacion, con permisos solo sobre su base.
$sql += @"

CREATE USER IF NOT EXISTS '$UsuarioApp'@'localhost' IDENTIFIED BY '$claveSql';
CREATE USER IF NOT EXISTS '$UsuarioApp'@'192.168.137.%' IDENTIFIED BY '$claveSql';
GRANT ALL PRIVILEGES ON ``$BaseDatos``.* TO '$UsuarioApp'@'localhost';
GRANT ALL PRIVILEGES ON ``$BaseDatos``.* TO '$UsuarioApp'@'192.168.137.%';
FLUSH PRIVILEGES;
"@

# El SQL se manda por la entrada estandar: la contrasena nunca toca un archivo.
$sql | & $mysql @argumentos 2>&1 | Out-Null

if ($LASTEXITCODE -ne 0) {
  Escribir '  No se pudo crear la base de datos. Revise los mensajes de MySQL.' -ForegroundColor Red
  exit 1
}

Escribir '  Base de datos, tablas, catalogo y usuario creados.' -ForegroundColor Green

# ---------------------------------------------------------------------
Titulo "7. Configurando el servidor"
# ---------------------------------------------------------------------

$envArchivo = Join-Path (Split-Path -Parent $raiz) 'server\.env'

$contenido = @"
PUERTO=3000
DB_MOTOR=mysql
DB_HOST=$HostMySQL
DB_PORT=$PuertoMySQL
DB_USER=$UsuarioApp
DB_PASSWORD=$claveAppPlana
DB_NAME=$BaseDatos
BCRYPT_ROUNDS=10
"@

[System.IO.File]::WriteAllText($envArchivo, $contenido, (New-Object System.Text.UTF8Encoding($false)))

Escribir "  Archivo escrito: $envArchivo" -ForegroundColor Green
Escribir '  (esta en el .gitignore: la contrasena no se publica).' -ForegroundColor DarkGray

# ---------------------------------------------------------------------
Titulo "8. Comprobacion final"
# ---------------------------------------------------------------------

$env:MYSQL_PWD = $claveAppPlana
$comprobacion = & $mysql -u $UsuarioApp "--connect-timeout=8" -e "USE ``$BaseDatos``; SELECT COUNT(*) AS tablas FROM information_schema.TABLES WHERE TABLE_SCHEMA='$BaseDatos';" 2>&1 | Out-String
Remove-Item Env:\MYSQL_PWD -ErrorAction SilentlyContinue

if ($LASTEXITCODE -eq 0) {
  Escribir '  El usuario de la aplicacion se conecto correctamente.' -ForegroundColor Green
} else {
  Escribir "  $($comprobacion.Trim())" -ForegroundColor Red
}

Escribir ''
Escribir '  Listo. Ahora ejecute "iniciar-servidor.bat".' -ForegroundColor Green
Escribir ''
