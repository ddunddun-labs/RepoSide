$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

function Send-Event {
  param([hashtable]$Event)
  [Console]::WriteLine(($Event | ConvertTo-Json -Compress))
}

$lastMode = ''
$lastRepository = ''
$lastProcessId = 0
$repositoryButton = $null

while ($true) {
  try {
    $desktopProcess = Get-Process -Name 'GitHubDesktop' -ErrorAction SilentlyContinue |
      Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero } |
      Select-Object -First 1

    if (-not $desktopProcess) {
      if ($lastMode -ne 'not-running') {
        Send-Event @{ type = 'mode'; mode = 'not-running' }
        $lastMode = 'not-running'
        $lastRepository = ''
      }
      $repositoryButton = $null
      $lastProcessId = 0
      Start-Sleep -Milliseconds 500
      continue
    }

    if ($desktopProcess.Id -ne $lastProcessId) {
      $repositoryButton = $null
      $lastProcessId = $desktopProcess.Id
      $lastRepository = ''
    }

    if (-not $repositoryButton) {
      $root = [System.Windows.Automation.AutomationElement]::FromHandle(
        $desktopProcess.MainWindowHandle
      )
      $buttonCondition = [System.Windows.Automation.PropertyCondition]::new(
        [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
        [System.Windows.Automation.ControlType]::Button
      )
      $buttons = $root.FindAll(
        [System.Windows.Automation.TreeScope]::Descendants,
        $buttonCondition
      )
      foreach ($button in $buttons) {
        if ($button.Current.Name -like 'Current repository *') {
          $repositoryButton = $button
          break
        }
      }
    }

    if (-not $repositoryButton) {
      if ($lastMode -ne 'delayed') {
        Send-Event @{ type = 'mode'; mode = 'delayed' }
        $lastMode = 'delayed'
      }
      Start-Sleep -Milliseconds 1000
      continue
    }

    if ($lastMode -ne 'fast') {
      Send-Event @{ type = 'mode'; mode = 'fast' }
      $lastMode = 'fast'
    }

    $name = $repositoryButton.Current.Name
    $repositoryName = $name.Substring('Current repository '.Length)
    if ($repositoryName -and $repositoryName -ne $lastRepository) {
      Send-Event @{ type = 'repository'; name = $repositoryName }
      $lastRepository = $repositoryName
    }
    Start-Sleep -Milliseconds 150
  } catch {
    $repositoryButton = $null
    if ($lastMode -ne 'delayed') {
      Send-Event @{ type = 'mode'; mode = 'delayed' }
      $lastMode = 'delayed'
    }
    Start-Sleep -Milliseconds 1000
  }
}
