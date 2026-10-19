# build-deploy-web.ps1
# Empaqueta la app web (Next.js en modo standalone) en un .tar.gz listo para el VPS.
# Se deploya junto al servicio copilot-runtime para que front + API queden en el
# mismo host (same-origin, sin CORS ni cookies cross-site).
#
# Uso:
#   .\build-deploy-web.ps1                 # build + genera .\web-deploy.tar.gz
#   .\build-deploy-web.ps1 -SkipBuild      # reempaqueta usando el build actual
#
# En el VPS: descomprimir en /var/www/web_ia y 'pm2 start ecosystem.web.config.cjs'.

param(
    [string]$Output = "web-deploy.tar.gz",
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $MyInvocation.MyCommand.Path)

$standalone = ".next/standalone"

if (-not $SkipBuild) {
    Write-Host "==> 1/5 next build..." -ForegroundColor Cyan
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Fallo next build" }
} else {
    Write-Host "==> 1/5 next build (omitido)" -ForegroundColor DarkGray
}

if (-not (Test-Path -LiteralPath "$standalone/server.js")) {
    throw "No existe $standalone/server.js. Corré el build primero."
}

# Next NO copia `public/` ni `.next/static` dentro de standalone: hay que hacerlo a mano.
Write-Host "==> 2/5 Copiando public/ y .next/static..." -ForegroundColor Cyan
$dest = "$standalone/.next/static"
if (Test-Path -LiteralPath $dest) { Remove-Item -LiteralPath $dest -Recurse -Force }
Copy-Item -LiteralPath ".next/static" -Destination $dest -Recurse

if (Test-Path -LiteralPath "$standalone/public") { Remove-Item -LiteralPath "$standalone/public" -Recurse -Force }
if (Test-Path -LiteralPath "public") { Copy-Item -LiteralPath "public" -Destination "$standalone/public" -Recurse }

Write-Host "==> 3/5 Copiando config de deploy..." -ForegroundColor Cyan
foreach ($p in @("ecosystem.web.config.cjs", "nginx/web-ia.conf", ".env.web.example")) {
    if (Test-Path -LiteralPath $p) {
        Copy-Item -LiteralPath $p -Destination (Join-Path $standalone (Split-Path -Leaf $p)) -Force
    }
}

Write-Host "==> 4/5 Limpiando artefactos pesados..." -ForegroundColor Cyan
# sharp/grpc/protobuf no se usan en runtime (firebase-admin sí traza @google-cloud).
# No borramos nada agresivo para no romper el trace; sólo caches del build.
foreach ($junk in @("$standalone/.next/cache")) {
    if (Test-Path -LiteralPath $junk) { Remove-Item -LiteralPath $junk -Recurse -Force }
}

Write-Host "==> 5/5 Empaquetando '$Output'..." -ForegroundColor Cyan
if (Test-Path -LiteralPath $Output) { Remove-Item -LiteralPath $Output -Force }

& tar -czf $Output -C $standalone .
if ($LASTEXITCODE -ne 0) { throw "Fallo tar" }

$size = (Get-Item -LiteralPath $Output).Length / 1MB
Write-Host ("==> Listo: {0} ({1:N1} MB)" -f $Output, $size) -ForegroundColor Green
Write-Host "    En el VPS: descomprimir en /var/www/web_ia y 'pm2 start ecosystem.web.config.cjs'" -ForegroundColor Green
