$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCommand) { $gameNode = $nodeCommand.Source } else { $gameNode = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' }
if (-not (Test-Path -LiteralPath $gameNode)) { throw 'Node.js не найден. Установите Node.js 20.19+.' }
if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'node_modules\vite\bin\vite.js'))) { throw 'Зависимости не установлены. Выполните pnpm install.' }
Write-Host 'DEAD TIDE — откройте http://127.0.0.1:5173 (Ctrl+C для остановки)'
& $gameNode (Join-Path $PSScriptRoot 'node_modules\vite\bin\vite.js') --host 127.0.0.1
