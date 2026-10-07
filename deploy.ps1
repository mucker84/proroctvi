# Build hry Proroctví a kopie do repozitáře 7ax-fun (hra poběží na 7ax.fun/proroctvi/).
$ErrorActionPreference = 'Stop'
$root   = $PSScriptRoot
$target = 'c:\xampp\htdocs\7ax-fun\proroctvi'
$apiTarget = 'c:\xampp\htdocs\7ax-fun\api\proroctvi'
$tmp    = Join-Path $env:TEMP 'proroctvi-dist'

Push-Location $root
try {
  Write-Host "Stavím Proroctví pro /proroctvi/..."
  npx vite build --base=/proroctvi/ --outDir $tmp --emptyOutDir
  if ($LASTEXITCODE -ne 0) { throw 'Build selhal.' }
} finally { Pop-Location }

if (Test-Path $target) { Remove-Item -Recurse -Force $target }
Copy-Item $tmp $target -Recurse
Write-Host "Úspěšně nasazeno do $target!"

# Nasazení Vercel Serverless API pro online multiplayer
New-Item -ItemType Directory -Force $apiTarget | Out-Null
Copy-Item "$root\server\room.mjs" "$apiTarget\room.mjs" -Force
Write-Host "Nasazeno API místností do $apiTarget\room.mjs!"

Get-ChildItem $target -Recurse -File | ForEach-Object { '  ' + $_.FullName.Substring($target.Length + 1) + '  (' + $_.Length + ' B)' }
