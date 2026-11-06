# Genera los iconos de Android y de la web a partir del logo (docs/Logo_Paty.png). No necesita instalar nada.
# Uso, desde frontend/:  powershell -ExecutionPolicy Bypass -File scripts/generar-iconos.ps1
Add-Type -AssemblyName System.Drawing

$frontend = Split-Path -Parent $PSScriptRoot
$logoPath = Join-Path (Split-Path -Parent $frontend) 'docs\Logo_Paty.png'
$res = Join-Path $frontend 'android\app\src\main\res'
$logo = [System.Drawing.Bitmap]::FromFile($logoPath)

# El color de fondo se toma del propio logo, para que el icono no tenga bordes de otro color
$bg = $logo.GetPixel([int]($logo.Width * 0.5), [int]($logo.Height * 0.08))

function New-Canvas([int]$w, [int]$h) {
  $bmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  return @{ Bitmap = $bmp; Graphics = $g }
}

function Save-Canvas($c, [string]$path) {
  $c.Graphics.Dispose()
  $c.Bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $c.Bitmap.Dispose()
}

# Dibuja el centro del logo. share = qué parte del logo se usa (1 = completo; menos = recorta los bordes redondeados)
function Draw-Logo($g, [single]$x, [single]$y, [single]$size, [single]$share = 1) {
  $src = [single]($logo.Width * $share)
  $off = [single](($logo.Width - $src) / 2)
  $dest = New-Object System.Drawing.RectangleF($x, $y, $size, $size)
  $from = New-Object System.Drawing.RectangleF($off, $off, $src, $src)
  $g.DrawImage($logo, $dest, $from, [System.Drawing.GraphicsUnit]::Pixel)
}

# --- Icono de la app, por densidad ---
$densities = @{ mdpi = 48; hdpi = 72; xhdpi = 96; xxhdpi = 144; xxxhdpi = 192 }
foreach ($d in $densities.Keys) {
  $size = $densities[$d]
  $dir = Join-Path $res "mipmap-$d"

  # Android antiguo: el logo completo
  $c = New-Canvas $size $size
  Draw-Logo $c.Graphics 0 0 $size
  Save-Canvas $c (Join-Path $dir 'ic_launcher.png')

  # Icono redondo: se recorta al centro para que la flor quepa en el círculo
  $c = New-Canvas $size $size
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddEllipse(0, 0, $size - 1, $size - 1)
  $c.Graphics.SetClip($path)
  Draw-Logo $c.Graphics 0 0 $size 0.86
  $path.Dispose()
  Save-Canvas $c (Join-Path $dir 'ic_launcher_round.png')

  # Icono adaptativo: lienzo de 108 dp, del que el sistema solo muestra el círculo central de 66 dp.
  # El logo se recorta para quitar su marco y la flor queda dentro de esa zona segura.
  $fg = [int]($size * 108 / 48)
  $c = New-Canvas $fg $fg
  $logoSize = [single]($fg * 0.70)
  $at = [single](($fg - $logoSize) / 2)
  Draw-Logo $c.Graphics $at $at $logoSize 0.82
  Save-Canvas $c (Join-Path $dir 'ic_launcher_foreground.png')
}

# Fondo del icono adaptativo
$colorFile = Join-Path $res 'values\ic_launcher_background.xml'
$hex = '#{0:X2}{1:X2}{2:X2}' -f $bg.R, $bg.G, $bg.B
$xml = "<?xml version=`"1.0`" encoding=`"utf-8`"?>`n<resources>`n    <color name=`"ic_launcher_background`">$hex</color>`n</resources>`n"
[System.IO.File]::WriteAllText($colorFile, $xml)

# --- Pantalla de inicio: mismas medidas que tenían, fondo del logo y logo centrado ---
Get-ChildItem $res -Recurse -Filter 'splash.png' | ForEach-Object {
  $old = [System.Drawing.Bitmap]::FromFile($_.FullName)
  $w = $old.Width; $h = $old.Height
  $old.Dispose()
  $c = New-Canvas $w $h
  $c.Graphics.Clear($bg)
  $s = [single]([Math]::Min($w, $h) * 0.42)
  Draw-Logo $c.Graphics (($w - $s) / 2) (($h - $s) / 2) $s
  Save-Canvas $c $_.FullName
}

# --- Web: icono del navegador y de "añadir a inicio" ---
foreach ($size in 192, 512) {
  $c = New-Canvas $size $size
  Draw-Logo $c.Graphics 0 0 $size
  Save-Canvas $c (Join-Path $frontend "public\icon-$size.png")
}

$logo.Dispose()
Write-Output "Iconos generados. Color de fondo: $hex"
