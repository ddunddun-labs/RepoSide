param(
  [Parameter(Mandatory = $true)][ValidateSet('inspect', 'apply')][string]$Operation,
  [string]$RepositoryName,
  [string]$SummaryBase64,
  [string]$DescriptionBase64
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

function Write-Result($value) {
  $json = $value | ConvertTo-Json -Compress
  [Console]::WriteLine([Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($json)))
}

function Get-CurrentDesktop {
  $process = Get-Process -Name 'GitHubDesktop' -ErrorAction SilentlyContinue |
    Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero } |
    Select-Object -First 1
  if (-not $process) { throw 'GitHub Desktop 창을 찾지 못했어. 앱을 열고 다시 시도해줘.' }

  $root = [System.Windows.Automation.AutomationElement]::FromHandle($process.MainWindowHandle)
  $buttons = $root.FindAll(
    [System.Windows.Automation.TreeScope]::Descendants,
    [System.Windows.Automation.PropertyCondition]::new(
      [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
      [System.Windows.Automation.ControlType]::Button
    )
  )
  $repositoryButtons = @($buttons | Where-Object { $_.Current.Name -like 'Current repository *' })
  if ($repositoryButtons.Count -ne 1) { throw 'GitHub Desktop에서 현재 저장소를 확인하지 못했어.' }
  $name = $repositoryButtons[0].Current.Name.Substring('Current repository '.Length)

  $edits = [System.Collections.Generic.List[System.Windows.Automation.AutomationElement]]::new()
  foreach ($controlType in @(
      [System.Windows.Automation.ControlType]::Edit,
      [System.Windows.Automation.ControlType]::ComboBox
    )) {
    $matches = $root.FindAll(
      [System.Windows.Automation.TreeScope]::Descendants,
      [System.Windows.Automation.PropertyCondition]::new(
        [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
        $controlType
      )
    )
    foreach ($match in $matches) { $edits.Add($match) }
  }
  $summaryEdit = $null
  $descriptionEdit = $null
  foreach ($edit in $edits) {
    $label = ($edit.Current.Name + ' ' + $edit.Current.AutomationId).ToLowerInvariant()
    if (-not $summaryEdit -and $label -match 'summary|subject|commit-message') { $summaryEdit = $edit }
    if (-not $descriptionEdit -and $label -match 'description|body|commit-description') { $descriptionEdit = $edit }
  }
  if (-not $summaryEdit -or -not $descriptionEdit) {
    throw '커밋 제목 또는 본문 입력창을 찾지 못했어. GitHub Desktop 접근성 창으로 실행했는지 확인해줘.'
  }

  $selectedFiles = [System.Collections.Generic.List[string]]::new()
  $partialFiles = [System.Collections.Generic.List[string]]::new()
  $selectedViewFiles = [System.Collections.Generic.List[string]]::new()
  $listItems = $root.FindAll(
    [System.Windows.Automation.TreeScope]::Descendants,
    [System.Windows.Automation.PropertyCondition]::new(
      [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
      [System.Windows.Automation.ControlType]::ListItem
    )
  )
  foreach ($item in $listItems) {
    $file = $item.Current.Name -replace '\s+(Modified|Added|Deleted|Renamed|Copied|Untracked)(\s+included)?$', ''
    $selectedInView = $false
    try {
      $selectedInView = $item.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern).Current.IsSelected
    } catch { }
    if ($selectedInView -and $file) { $selectedViewFiles.Add($file.Replace('\', '/')) }

    $checkboxes = $item.FindAll(
      [System.Windows.Automation.TreeScope]::Descendants,
      [System.Windows.Automation.PropertyCondition]::new(
        [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
        [System.Windows.Automation.ControlType]::CheckBox
      )
    )
    $included = $false
    $partiallyIncluded = $false
    foreach ($checkbox in $checkboxes) {
      try {
        $state = $checkbox.GetCurrentPattern([System.Windows.Automation.TogglePattern]::Pattern).Current.ToggleState
        if ($state -eq [System.Windows.Automation.ToggleState]::On) { $included = $true }
        if ($state -eq [System.Windows.Automation.ToggleState]::Indeterminate) {
          $included = $true
          $partiallyIncluded = $true
        }
      } catch { }
    }
    if ($included) {
      if ($file) { $selectedFiles.Add($file.Replace('\', '/')) }
    }
    if ($partiallyIncluded -and $file) { $partialFiles.Add($file.Replace('\', '/')) }
  }

  $lineCheckboxes = $root.FindAll(
    [System.Windows.Automation.TreeScope]::Descendants,
    [System.Windows.Automation.PropertyCondition]::new(
      [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
      [System.Windows.Automation.ControlType]::CheckBox
    )
  )
  $lineCheckboxCount = 0
  $checkedLineCheckboxCount = 0
  foreach ($checkbox in $lineCheckboxes) {
    if ($checkbox.Current.AutomationId -match '^\d+-(before|after)$') {
      $lineCheckboxCount++
      try {
        if ($checkbox.GetCurrentPattern([System.Windows.Automation.TogglePattern]::Pattern).Current.ToggleState -eq [System.Windows.Automation.ToggleState]::On) {
          $checkedLineCheckboxCount++
        }
      } catch { }
    }
  }

  $visibleFilePath = if ($selectedViewFiles.Count -eq 1) { $selectedViewFiles[0] } else { '' }

  return @{
    name = $name
    summaryEdit = $summaryEdit
    descriptionEdit = $descriptionEdit
    selectedFiles = @($selectedFiles | Sort-Object -Unique)
    partialFiles = @($partialFiles | Sort-Object -Unique)
    selectedViewFileCount = $selectedViewFiles.Count
    visibleFilePath = $visibleFilePath
    lineCheckboxCount = $lineCheckboxCount
    checkedLineCheckboxCount = $checkedLineCheckboxCount
  }
}

function Get-Value($element) {
  try {
    $pattern = $element.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
    return $pattern.Current.Value
  } catch {
    throw '커밋 입력창의 현재 내용을 확인할 수 없어 안전하게 중단했어.'
  }
}

try {
  $desktop = Get-CurrentDesktop
  if ($RepositoryName -and $desktop.name -ne $RepositoryName) {
    throw "GitHub Desktop 저장소가 바뀌었어. 현재 저장소: $($desktop.name)"
  }

  if ($Operation -eq 'inspect') {
    $summaryValue = Get-Value $desktop.summaryEdit
    $descriptionValue = Get-Value $desktop.descriptionEdit
    Write-Result @{
      success = $true
      repositoryName = $desktop.name
      summaryEmpty = [string]::IsNullOrWhiteSpace($summaryValue)
      descriptionEmpty = [string]::IsNullOrWhiteSpace($descriptionValue)
      selectedFiles = $desktop.selectedFiles
      partialFiles = $desktop.partialFiles
      selectedViewFileCount = $desktop.selectedViewFileCount
      visibleFilePath = $desktop.visibleFilePath
      lineCheckboxCount = $desktop.lineCheckboxCount
      checkedLineCheckboxCount = $desktop.checkedLineCheckboxCount
    }
    exit 0
  }

  $Summary = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($SummaryBase64))
  $Description = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($DescriptionBase64))
  if ([string]::IsNullOrWhiteSpace($Summary)) { throw '생성된 커밋 제목이 비어 있어 입력하지 않았어.' }
  if (-not [string]::IsNullOrWhiteSpace((Get-Value $desktop.summaryEdit)) -or
      -not [string]::IsNullOrWhiteSpace((Get-Value $desktop.descriptionEdit))) {
    throw 'GitHub Desktop 입력창에 기존 메시지가 있어 덮어쓰지 않았어. 내용을 비우고 다시 시도해줘.'
  }

  $summaryPattern = $desktop.summaryEdit.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
  $descriptionPattern = $desktop.descriptionEdit.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
  $summaryPattern.SetValue($Summary)
  $descriptionPattern.SetValue($Description)
  if ((Get-Value $desktop.summaryEdit) -cne $Summary -or
      (Get-Value $desktop.descriptionEdit) -cne $Description) {
    throw '입력 후 GitHub Desktop에서 메시지 내용을 확인하지 못했어. 생성 결과는 RepoSide에 남아 있어.'
  }

  Write-Result @{ success = $true; repositoryName = $desktop.name; message = '커밋 제목과 본문을 GitHub Desktop 입력창에서 확인했어.' }
} catch {
  Write-Result @{ success = $false; message = $_.Exception.Message }
  exit 2
}
