# Build hry Proroctví a kopie do repozitáře 7ax-fun (hra poběží na 7ax.fun/proroctvi/).
$ErrorActionPreference = 'Stop'
$root   = $PSScriptRoot
$target = 'c:\xampp\htdocs\7ax-fun\proroctvi'
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
Get-ChildItem $target -Recurse -File | ForEach-Object { '  ' + $_.FullName.Substring($target.Length + 1) + '  (' + $_.Length + ' B)' }
