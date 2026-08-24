param(
  [int]$MaxDepth = 14,
  [switch]$AllNamedElements
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type @'
using System;
using System.Runtime.InteropServices;
using System.Text;

public static class NativeWindowInspector {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

  [DllImport("user32.dll")]
  public static extern bool EnumChildWindows(
    IntPtr hWndParent,
    EnumWindowsProc callback,
    IntPtr lParam
  );

  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  public static extern int GetClassName(IntPtr hWnd, StringBuilder className, int maxCount);

  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int maxCount);
}
'@

$desktopProcess = Get-Process -Name 'GitHubDesktop' -ErrorAction SilentlyContinue |
  Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero } |
  Select-Object -First 1

if (-not $desktopProcess) {
  throw 'GitHub Desktop window not found. Open GitHub Desktop and try again.'
}

$root = [System.Windows.Automation.AutomationElement]::FromHandle(
  $desktopProcess.MainWindowHandle
)
$walker = [System.Windows.Automation.TreeWalker]::RawViewWalker
$interestingControlTypes = @(
  'ControlType.Button',
  'ControlType.ComboBox',
  'ControlType.List',
  'ControlType.ListItem',
  'ControlType.Tab',
  'ControlType.TabItem',
  'ControlType.Text',
  'ControlType.Tree',
  'ControlType.TreeItem'
)

function Get-IsSelected {
  param([System.Windows.Automation.AutomationElement]$Element)
  try {
    $pattern = $Element.GetCurrentPattern(
      [System.Windows.Automation.SelectionItemPattern]::Pattern
    )
    return $pattern.Current.IsSelected
  } catch {
    return $false
  }
}

function Write-Element {
  param(
    [System.Windows.Automation.AutomationElement]$Element,
    [int]$Depth
  )

  try {
    $name = $Element.Current.Name
    $controlType = $Element.Current.ControlType.ProgrammaticName
    $automationId = $Element.Current.AutomationId
    $className = $Element.Current.ClassName
    $selected = Get-IsSelected -Element $Element
    $interesting = $selected -or $AllNamedElements -or (
      $name -and $interestingControlTypes -contains $controlType
    )

    if ($interesting) {
      $marker = if ($selected) { '[SELECTED]' } else { '          ' }
      $indent = '  ' * $Depth
      Write-Output (
        '{0} {1}{2} | {3} | AutomationId={4} | Class={5}' -f
        $marker,
        $indent,
        $name,
        $controlType,
        $automationId,
        $className
      )
    }
  } catch {
    return
  }
}

function Visit-Element {
  param(
    [System.Windows.Automation.AutomationElement]$Element,
    [int]$Depth
  )

  Write-Element -Element $Element -Depth $Depth
  if ($Depth -ge $MaxDepth) { return }

  try {
    $child = $walker.GetFirstChild($Element)
    while ($child) {
      Visit-Element -Element $child -Depth ($Depth + 1)
      $child = $walker.GetNextSibling($child)
    }
  } catch {
    return
  }
}

Write-Output ('GitHub Desktop PID: {0}' -f $desktopProcess.Id)
Write-Output ('Window: {0}' -f $root.Current.Name)
$processInfo = Get-CimInstance Win32_Process -Filter ('ProcessId={0}' -f $desktopProcess.Id)
Write-Output ('CommandLine: {0}' -f $processInfo.CommandLine)

$handles = [System.Collections.Generic.List[IntPtr]]::new()
$handles.Add($desktopProcess.MainWindowHandle)
$callback = [NativeWindowInspector+EnumWindowsProc]{
  param([IntPtr]$handle, [IntPtr]$parameter)
  $handles.Add($handle)
  return $true
}
[NativeWindowInspector]::EnumChildWindows(
  $desktopProcess.MainWindowHandle,
  $callback,
  [IntPtr]::Zero
) | Out-Null

Write-Output ('Child HWND count: {0}' -f ($handles.Count - 1))
foreach ($handle in $handles) {
  $className = [System.Text.StringBuilder]::new(256)
  $windowText = [System.Text.StringBuilder]::new(512)
  [NativeWindowInspector]::GetClassName($handle, $className, $className.Capacity) | Out-Null
  [NativeWindowInspector]::GetWindowText($handle, $windowText, $windowText.Capacity) | Out-Null
  Write-Output ('--- HWND {0} | Class={1} | Text={2} ---' -f $handle, $className, $windowText)

  try {
    $element = [System.Windows.Automation.AutomationElement]::FromHandle($handle)
    Visit-Element -Element $element -Depth 0
  } catch {
    Write-Output ('UIA error: {0}' -f $_.Exception.Message)
  }
}
