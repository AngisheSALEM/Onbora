param(
    [switch]$ConfigureOnly,
    [string]$InterfaceAlias
)

$ErrorActionPreference = 'Stop'

# Ignore loopback, disconnected adapters and virtual networks without a gateway.
$networkConfigs = @(Get-NetIPConfiguration | Where-Object {
    $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq 'Up' -and
    (!$InterfaceAlias -or $_.InterfaceAlias -eq $InterfaceAlias)
})
$addresses = @($networkConfigs | ForEach-Object {
    $_.IPv4Address | Where-Object {
        $_.IPAddress -ne '127.0.0.1' -and $_.IPAddress -notlike '169.254.*'
    } | Select-Object -ExpandProperty IPAddress
} | Select-Object -Unique)

if ($addresses.Count -ne 1) {
    throw 'Impossible de choisir un reseau unique. Utilisez -InterfaceAlias avec le reseau partage avec le telephone (Get-NetIPConfiguration).'
}

$apiUrl = "http://$($addresses[0]):8000"
$envPath = Join-Path $PSScriptRoot '.env'
$templatePath = Join-Path $PSScriptRoot '.env.example'
$envText = if (Test-Path -LiteralPath $envPath) {
    [System.IO.File]::ReadAllText($envPath)
} else {
    [System.IO.File]::ReadAllText($templatePath)
}

if ($envText -match '(?m)^API_BASE_URL=') {
    $envText = [regex]::Replace($envText, '(?m)^API_BASE_URL=[^\r\n]*', "API_BASE_URL=$apiUrl")
} else {
    $envText = $envText.TrimEnd() + "`r`nAPI_BASE_URL=$apiUrl`r`n"
}
[System.IO.File]::WriteAllText($envPath, $envText, [System.Text.UTF8Encoding]::new($false))

Write-Host "Backend mobile : $apiUrl"
Write-Host 'Backend a lancer : python manage.py runserver 0.0.0.0:8000'
Write-Host 'Le PC et le telephone doivent partager le meme reseau.'

if (!$ConfigureOnly) {
    Push-Location $PSScriptRoot
    try {
        & flutter run
        if ($LASTEXITCODE -ne 0) {
            throw "flutter run a echoue (code $LASTEXITCODE)."
        }
    } finally {
        Pop-Location
    }
}
