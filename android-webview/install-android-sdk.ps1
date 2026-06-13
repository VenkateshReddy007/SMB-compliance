$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ProjectRoot
$WorkspaceRoot = Split-Path -Parent (Split-Path -Parent $RepoRoot)
$SdkRoot = Join-Path $WorkspaceRoot "android-sdk"
$TempRoot = Join-Path $WorkspaceRoot "android-sdk-download"
$ZipPath = Join-Path $TempRoot "commandlinetools-win.zip"
$ToolsUrl = "https://dl.google.com/android/repository/commandlinetools-win-13114758_latest.zip"

New-Item -ItemType Directory -Force -Path $SdkRoot, $TempRoot | Out-Null

if (-not (Test-Path (Join-Path $SdkRoot "cmdline-tools\latest\bin\sdkmanager.bat"))) {
    Remove-Item $ZipPath -Force -ErrorAction SilentlyContinue
    & curl.exe -L -C - --retry 10 --retry-delay 5 -o $ZipPath $ToolsUrl
    Remove-Item (Join-Path $TempRoot "cmdline-tools") -Recurse -Force -ErrorAction SilentlyContinue
    & tar -xf $ZipPath -C $TempRoot

    $LatestTools = Join-Path $SdkRoot "cmdline-tools\latest"
    Remove-Item $LatestTools -Recurse -Force -ErrorAction SilentlyContinue
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $LatestTools) | Out-Null
    Move-Item -Path (Join-Path $TempRoot "cmdline-tools") -Destination $LatestTools
}

$SdkManager = Join-Path $SdkRoot "cmdline-tools\latest\bin\sdkmanager.bat"
$env:ANDROID_SDK_ROOT = $SdkRoot
$env:ANDROID_HOME = $SdkRoot

($yes = "y`n" * 20) | & $SdkManager --sdk_root=$SdkRoot --licenses
($yes = "y`n" * 20) | & $SdkManager --sdk_root=$SdkRoot "platform-tools" "platforms;android-35" "build-tools;35.0.0"
Write-Host "Android SDK ready at $SdkRoot"
