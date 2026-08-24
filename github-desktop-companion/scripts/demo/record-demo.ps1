param(
  [Parameter(Mandatory = $true)]
  [string]$RepositoryA,

  [Parameter(Mandatory = $true)]
  [string]$RepositoryB,

  [string]$OutputDirectory = '.\demo-frames',
  [int]$FramesPerSecond = 10
)

$ErrorActionPreference = 'Stop'

if ($FramesPerSecond -lt 5 -or $FramesPerSecond -gt 30) {
  throw 'FramesPerSecond must be between 5 and 30.'
}

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type @'
using System;
using System.Runtime.InteropServices;

public static class DemoNative {
  [DllImport("user32.dll")]
  public static extern bool SetForegroundWindow(IntPtr hWnd);

  [DllImport("user32.dll")]
  public static extern bool ShowWindow(IntPtr hWnd, int command);

  [DllImport("user32.dll")]
  public static extern bool MoveWindow(
    IntPtr hWnd,
    int x,
    int y,
    int width,
    int height,
    bool repaint
  );

  [DllImport("user32.dll")]
  public static extern bool SetWindowPos(
    IntPtr hWnd,
    IntPtr insertAfter,
    int x,
    int y,
    int width,
    int height,
    uint flags
  );

  [DllImport("user32.dll")]
  public static extern bool SetCursorPos(int x, int y);

  [DllImport("user32.dll")]
  public static extern void mouse_event(
    uint flags,
    uint dx,
    uint dy,
    uint data,
    UIntPtr extraInfo
  );
}
'@

$githubDesktop = Get-Process -Name 'GitHubDesktop' -ErrorAction SilentlyContinue |
  Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero } |
  Select-Object -First 1
$companion = Get-Process -Name 'electron' -ErrorAction SilentlyContinue |
  Where-Object {
    $_.MainWindowHandle -ne [IntPtr]::Zero -and
    $_.MainWindowTitle -eq 'GitHub Desktop Companion'
  } |
  Select-Object -First 1

if (-not $githubDesktop) {
  throw 'GitHub Desktop window not found.'
}
if (-not $companion) {
  throw 'GitHub Desktop Companion window not found. Run npm run dev first.'
}

$outputPath = [System.IO.Path]::GetFullPath($OutputDirectory)
[System.IO.Directory]::CreateDirectory($outputPath) | Out-Null
Get-ChildItem -LiteralPath $outputPath -Filter 'frame-*.png' -ErrorAction SilentlyContinue |
  Remove-Item -Force

$screen = [System.Windows.Forms.SystemInformation]::VirtualScreen
$margin = 24
$gap = 16
$top = [Math]::Max($screen.Top + $margin, 0)
$windowWidth = [int](($screen.Width - ($margin * 2) - $gap) / 2)
$windowHeight = [Math]::Min($screen.Height - ($margin * 2), 1080)
$left = $screen.Left + $margin
$right = $left + $windowWidth + $gap

foreach ($window in @($githubDesktop, $companion)) {
  [DemoNative]::ShowWindow($window.MainWindowHandle, 9) | Out-Null
}
[DemoNative]::MoveWindow(
  $githubDesktop.MainWindowHandle,
  $left,
  $top,
  $windowWidth,
  $windowHeight,
  $true
) | Out-Null
[DemoNative]::MoveWindow(
  $companion.MainWindowHandle,
  $right,
  $top,
  $windowWidth,
  $windowHeight,
  $true
) | Out-Null
Start-Sleep -Milliseconds 500

$captureBounds = [System.Drawing.Rectangle]::new(
  $left,
  $top,
  ($windowWidth * 2) + $gap,
  $windowHeight
)
$frameInterval = [int](1000 / $FramesPerSecond)
$script:frameNumber = 0

function Bring-DemoWindowsToFront {
  $noMoveOrResizeOrActivate = 0x0013
  [DemoNative]::SetWindowPos(
    $companion.MainWindowHandle,
    [IntPtr]::Zero,
    0,
    0,
    0,
    0,
    $noMoveOrResizeOrActivate
  ) | Out-Null
  [DemoNative]::SetWindowPos(
    $githubDesktop.MainWindowHandle,
    [IntPtr]::Zero,
    0,
    0,
    0,
    0,
    $noMoveOrResizeOrActivate
  ) | Out-Null
}

function Get-GitHubDesktopRoot {
  return [System.Windows.Automation.AutomationElement]::FromHandle(
    $githubDesktop.MainWindowHandle
  )
}

function Find-Element {
  param([scriptblock]$Predicate)

  $root = Get-GitHubDesktopRoot
  $elements = $root.FindAll(
    [System.Windows.Automation.TreeScope]::Descendants,
    [System.Windows.Automation.Condition]::TrueCondition
  )
  foreach ($element in $elements) {
    try {
      if (& $Predicate $element) { return $element }
    } catch {
      continue
    }
  }
  return $null
}

function Click-Element {
  param([System.Windows.Automation.AutomationElement]$Element)

  $bounds = $Element.Current.BoundingRectangle
  if ($bounds.IsEmpty) { throw 'Automation element has no visible bounds.' }
  $x = [int]($bounds.Left + ($bounds.Width / 2))
  $y = [int]($bounds.Top + ($bounds.Height / 2))
  [DemoNative]::SetCursorPos($x, $y) | Out-Null
  [DemoNative]::mouse_event(2, 0, 0, 0, [UIntPtr]::Zero)
  [DemoNative]::mouse_event(4, 0, 0, 0, [UIntPtr]::Zero)
}

function Open-RepositoryMenu {
  [DemoNative]::SetForegroundWindow($githubDesktop.MainWindowHandle) | Out-Null
  $button = Find-Element {
    param($element)
    $element.Current.ControlType -eq [System.Windows.Automation.ControlType]::Button -and
      $element.Current.Name -like 'Current repository*'
  }
  if (-not $button) { throw 'Current repository button not found.' }
  Click-Element -Element $button
  Start-Sleep -Milliseconds 250
}

function Set-RepositoryFilter {
  param([string]$RepositoryName)

  $filter = Find-Element {
    param($element)
    $element.Current.ControlType -eq [System.Windows.Automation.ControlType]::Edit -and
      $element.Current.Name -eq 'Filter'
  }
  if (-not $filter) { throw 'Repository filter field not found.' }
  $filter.SetFocus()
  $value = $filter.GetCurrentPattern(
    [System.Windows.Automation.ValuePattern]::Pattern
  )
  $value.SetValue($RepositoryName)
}

function Confirm-RepositorySelection {
  [System.Windows.Forms.SendKeys]::SendWait('{ENTER}')
}

function Get-CurrentRepositoryName {
  $button = Find-Element {
    param($element)
    $element.Current.ControlType -eq [System.Windows.Automation.ControlType]::Button -and
      $element.Current.Name -like 'Current repository*'
  }
  if (-not $button) { return $null }
  return $button.Current.Name -replace '^Current repository\s+', ''
}

function Wait-ForRepository {
  param(
    [string]$RepositoryName,
    [int]$TimeoutMilliseconds = 4000
  )

  $deadline = [DateTime]::UtcNow.AddMilliseconds($TimeoutMilliseconds)
  while ([DateTime]::UtcNow -lt $deadline) {
    if ((Get-CurrentRepositoryName) -eq $RepositoryName) { return }
    Start-Sleep -Milliseconds 100
  }
  throw "GitHub Desktop did not select Repository: $RepositoryName"
}

function Capture-Frame {
  Bring-DemoWindowsToFront
  $bitmap = [System.Drawing.Bitmap]::new(
    $captureBounds.Width,
    $captureBounds.Height
  )
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  try {
    $graphics.CopyFromScreen(
      $captureBounds.Left,
      $captureBounds.Top,
      0,
      0,
      $captureBounds.Size
    )
    $fileName = 'frame-{0:D4}.png' -f $script:frameNumber
    $bitmap.Save(
      [System.IO.Path]::Combine($outputPath, $fileName),
      [System.Drawing.Imaging.ImageFormat]::Png
    )
    $script:frameNumber++
  } finally {
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

function Capture-Frames {
  param([int]$Count)

  for ($index = 0; $index -lt $Count; $index++) {
    $startedAt = [DateTime]::UtcNow
    Capture-Frame
    $elapsed = ([DateTime]::UtcNow - $startedAt).TotalMilliseconds
    $remaining = $frameInterval - $elapsed
    if ($remaining -gt 0) { Start-Sleep -Milliseconds ([int]$remaining) }
  }
}

function Select-RepositoryBeforeCapture {
  param([string]$RepositoryName)

  if ((Get-CurrentRepositoryName) -eq $RepositoryName) { return }
  Open-RepositoryMenu
  Set-RepositoryFilter -RepositoryName $RepositoryName
  Start-Sleep -Milliseconds 300
  Confirm-RepositorySelection
  Wait-ForRepository -RepositoryName $RepositoryName
  Start-Sleep -Milliseconds 600
}

Select-RepositoryBeforeCapture -RepositoryName $RepositoryA
[DemoNative]::SetForegroundWindow($githubDesktop.MainWindowHandle) | Out-Null
Capture-Frames -Count 15

Open-RepositoryMenu
Capture-Frames -Count 5
Set-RepositoryFilter -RepositoryName $RepositoryB
Capture-Frames -Count 6
Confirm-RepositorySelection
Capture-Frames -Count 15
Wait-ForRepository -RepositoryName $RepositoryB
Capture-Frames -Count 10

Open-RepositoryMenu
Capture-Frames -Count 5
Set-RepositoryFilter -RepositoryName $RepositoryA
Capture-Frames -Count 6
Confirm-RepositorySelection
Capture-Frames -Count 15
Wait-ForRepository -RepositoryName $RepositoryA
Capture-Frames -Count 15

Write-Output ('Frames: {0}' -f $script:frameNumber)
Write-Output ('Bounds: {0}x{1}' -f $captureBounds.Width, $captureBounds.Height)
Write-Output ('Output: {0}' -f $outputPath)
