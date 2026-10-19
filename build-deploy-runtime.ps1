# build-deploy-runtime.ps1
# Empaqueta el servicio de runtime de CopilotKit (proceso Node persistente) en un
# .tar.gz listo para el VPS. A diferencia del runtime de Next, este servicio NO
# necesita las dependencias de frontend: se genera un package.json mínimo y se
# instala sólo lo necesario.
#
# Uso:
#   .\build-deploy-runtime.ps1                 # genera .\runtime-deploy.tar.gz
#   .\build-deploy-runtime.ps1 -Output rt.tar.gz
#   .\build-deploy-runtime.ps1 -SkipInstall    # reempaqueta reusando node_modules

param(
    [string]$Output = "runtime-deploy.tar.gz",
    [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $MyInvocation.MyCommand.Path)

$stage = "runtime-deploy"
$reuseDeps = $SkipInstall -and (Test-Path -LiteralPath "$stage/node_modules")

if (-not $reuseDeps -and (Test-Path -LiteralPath $stage)) {
    Remove-Item -LiteralPath $stage -Recurse -Force
}
if (-not (Test-Path -LiteralPath $stage)) { New-Item -ItemType Directory -Path $stage | Out-Null }

Write-Host "==> 1/4 Copiando fuentes..." -ForegroundColor Cyan
foreach ($p in @("server", "src", "nginx")) {
    if (Test-Path -LiteralPath "$stage/$p") { Remove-Item -LiteralPath "$stage/$p" -Recurse -Force }
}
foreach ($p in @("tsconfig.json", "ecosystem.runtime.config.cjs", ".env.runtime.example")) {
    if (Test-Path -LiteralPath "$stage/$p") { Remove-Item -LiteralPath "$stage/$p" -Force }
}
Copy-Item -LiteralPath "server" -Destination "$stage/server" -Recurse
Copy-Item -LiteralPath "src" -Destination "$stage/src" -Recurse
Copy-Item -LiteralPath "tsconfig.json" -Destination "$stage/tsconfig.json"
Copy-Item -LiteralPath "ecosystem.runtime.config.cjs" -Destination "$stage/ecosystem.runtime.config.cjs"
if (Test-Path -LiteralPath "nginx") { Copy-Item -LiteralPath "nginx" -Destination "$stage/nginx" -Recurse }
if (Test-Path -LiteralPath ".env.runtime.example") { Copy-Item -LiteralPath ".env.runtime.example" -Destination "$stage/.env.runtime.example" }

Write-Host "==> 2/4 Escribiendo package.json mínimo..." -ForegroundColor Cyan
# NOTA: sin "type": "module" a propósito. Con ese campo, tsx resuelve mal un
# dependencia que publica .ts y .js juntos (fast-json-patch) y el servicio no arranca.
$pkg = @'
{
  "name": "copilot-runtime",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "start": "node --conditions=react-server --import tsx server/index.ts"
  },
  "dependencies": {
    "@ag-ui/client": "^1.0.1",
    "@copilotkit/runtime": "1.77.0",
    "firebase-admin": "^13.10.0",
    "server-only": "^0.0.1",
    "tsx": "^4.23.15"
  }
}
'@
[System.IO.File]::WriteAllText((Join-Path (Get-Location) "$stage/package.json"), $pkg)

if (-not $reuseDeps) {
    Write-Host "==> 3/4 npm install (sólo producción)..." -ForegroundColor Cyan
    Push-Location $stage
    npm install --omit=dev --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { Pop-Location; throw "Fallo npm install" }
    Pop-Location
} else {
    Write-Host "==> 3/4 npm install (reusando node_modules existente)" -ForegroundColor DarkGray
}

Write-Host "==> 4/4 Empaquetando '$Output'..." -ForegroundColor Cyan
if (Test-Path -LiteralPath $Output) { Remove-Item -LiteralPath $Output -Force }

& tar -czf $Output -C $stage .
if ($LASTEXITCODE -ne 0) { throw "Fallo tar" }

$size = (Get-Item -LiteralPath $Output).Length / 1MB
Write-Host ("==> Listo: {0} ({1:N1} MB)" -f $Output, $size) -ForegroundColor Green
Write-Host "    En el VPS: descomprimir y 'pm2 start ecosystem.runtime.config.cjs && pm2 save'" -ForegroundColor Green
