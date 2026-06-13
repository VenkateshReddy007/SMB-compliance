$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ProjectRoot
$WorkspaceRoot = Split-Path -Parent (Split-Path -Parent $RepoRoot)
$SdkRoot = Join-Path $WorkspaceRoot "android-sdk"
$BuildDir = Join-Path $ProjectRoot "build"
$OutDir = Join-Path $WorkspaceRoot "outputs"
$PackageName = "com.reggraphai.mobile"
$ApkName = "reggraph-ai-debug.apk"

$BuildTools = Get-ChildItem (Join-Path $SdkRoot "build-tools") -Directory |
    Sort-Object Name -Descending |
    Select-Object -First 1
if (-not $BuildTools) {
    throw "Android build-tools were not found under $SdkRoot. Install the SDK first."
}

$PlatformJar = Join-Path $SdkRoot "platforms\android-35\android.jar"
if (-not (Test-Path $PlatformJar)) {
    $PlatformJar = Get-ChildItem (Join-Path $SdkRoot "platforms") -Filter "android.jar" -Recurse |
        Sort-Object FullName -Descending |
        Select-Object -First 1 |
        ForEach-Object FullName
}
if (-not $PlatformJar -or -not (Test-Path $PlatformJar)) {
    throw "No Android platform android.jar found under $SdkRoot."
}

$Aapt2 = Join-Path $BuildTools.FullName "aapt2.exe"
$D8 = Join-Path $BuildTools.FullName "d8.bat"
$ZipAlign = Join-Path $BuildTools.FullName "zipalign.exe"
$ApkSigner = Join-Path $BuildTools.FullName "apksigner.bat"

function Invoke-Checked {
    param(
        [string] $FilePath,
        [string[]] $Arguments
    )
    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$FilePath failed with exit code $LASTEXITCODE"
    }
}

Remove-Item $BuildDir -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $BuildDir, $OutDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $BuildDir "compiled"), (Join-Path $BuildDir "gen"), (Join-Path $BuildDir "classes") | Out-Null

Invoke-Checked $Aapt2 @("compile", "--dir", (Join-Path $ProjectRoot "res"), "-o", (Join-Path $BuildDir "compiled"))
$CompiledResources = Get-ChildItem (Join-Path $BuildDir "compiled") -Filter "*.flat" | ForEach-Object { $_.FullName }
Invoke-Checked $Aapt2 (@(
    "link",
    "-I", $PlatformJar,
    "--manifest", (Join-Path $ProjectRoot "AndroidManifest.xml"),
    "--java", (Join-Path $BuildDir "gen"),
    "--min-sdk-version", "23",
    "--target-sdk-version", "35",
    "-o", (Join-Path $BuildDir "base-unsigned.apk")
) + $CompiledResources)

$Sources = @(
    (Join-Path $ProjectRoot "src\com\reggraphai\mobile\MainActivity.java"),
    (Join-Path $BuildDir "gen\com\reggraphai\mobile\R.java")
)

javac -encoding UTF-8 -source 8 -target 8 -bootclasspath $PlatformJar -d (Join-Path $BuildDir "classes") $Sources
if ($LASTEXITCODE -ne 0) {
    throw "javac failed with exit code $LASTEXITCODE"
}

$ClassFiles = Get-ChildItem (Join-Path $BuildDir "classes") -Filter "*.class" -Recurse | ForEach-Object { $_.FullName }
Invoke-Checked $D8 (@("--min-api", "23", "--lib", $PlatformJar, "--output", $BuildDir) + $ClassFiles)

Push-Location $BuildDir
try {
    & jar uf "base-unsigned.apk" "classes.dex"
}
finally {
    Pop-Location
}

$AlignedApk = Join-Path $BuildDir "aligned.apk"
Invoke-Checked $ZipAlign @("-f", "4", (Join-Path $BuildDir "base-unsigned.apk"), $AlignedApk)

$Keystore = Join-Path $BuildDir "debug.keystore"
keytool -genkeypair `
    -keystore $Keystore `
    -storepass android `
    -keypass android `
    -alias androiddebugkey `
    -keyalg RSA `
    -keysize 2048 `
    -validity 10000 `
    -dname "CN=Android Debug,O=Android,C=US" | Out-Null

$FinalApk = Join-Path $OutDir $ApkName
Invoke-Checked $ApkSigner @(
    "sign",
    "--ks", $Keystore,
    "--ks-pass", "pass:android",
    "--key-pass", "pass:android",
    "--out", $FinalApk,
    $AlignedApk
)

Invoke-Checked $ApkSigner @("verify", "--verbose", $FinalApk)
Write-Host "APK written to $FinalApk"
