param([Parameter(Mandatory = $true)][string]$BridgePath)

$ErrorActionPreference = 'Stop'
$resolvedBridgePath = (Resolve-Path $BridgePath).Path
$bridgeBytes = [System.IO.File]::ReadAllBytes($resolvedBridgePath)
if ($bridgeBytes.Length -lt 3 -or $bridgeBytes[0] -ne 239 -or $bridgeBytes[1] -ne 187 -or $bridgeBytes[2] -ne 191) {
  throw 'The bridge script must use a UTF-8 BOM for Windows PowerShell 5.1.'
}

$tokens = $null
$parseErrors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($resolvedBridgePath, [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count -gt 0) { throw ($parseErrors -join "`n") }
$functionNodes = $ast.FindAll({
  param($node)
  $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and
    $node.Name -in @('Get-CanonicalPathSignature', 'Test-CommitSelectionMatches')
}, $true)
foreach ($functionNode in $functionNodes) { Invoke-Expression $functionNode.Extent.Text }
if ($functionNodes.Count -ne 2) { throw 'Commit selection comparison helpers were not found.' }

$expected = ConvertFrom-Json '{"selectedFiles":["src/first.ts","src/second.ts"],"partialFiles":[],"commitFileCount":2}'
$previewChanged = [pscustomobject]@{
  selectedFiles = @('src/second.ts', 'src/first.ts')
  partialFiles = @()
  commitFileCount = [long]2
  visibleFilePath = 'src/unrelated-preview.ts'
  lineCheckboxCount = 9
  checkedLineCheckboxCount = 0
}
if (-not (Test-CommitSelectionMatches $expected $previewChanged)) {
  throw 'A preview-only change must not invalidate the selected commit scope.'
}
$normalizedPath = [pscustomobject]@{ selectedFiles = @('SRC\FIRST.TS', 'src\second.ts'); partialFiles = @(); commitFileCount = '2' }
if (-not (Test-CommitSelectionMatches $expected $normalizedPath)) {
  throw 'Path separator, case, or JSON number representation must not cause a false mismatch.'
}

$changedFile = [pscustomobject]@{ selectedFiles = @('src/first.ts', 'src/other.ts'); partialFiles = @(); commitFileCount = 2 }
if (Test-CommitSelectionMatches $expected $changedFile) { throw 'A changed committed file must invalidate the scope.' }
$partialLine = [pscustomobject]@{ selectedFiles = @('src/first.ts', 'src/second.ts'); partialFiles = @('src/second.ts'); commitFileCount = 2 }
if (Test-CommitSelectionMatches $expected $partialLine) { throw 'A newly partial file must invalidate the scope.' }
$changedCount = [pscustomobject]@{ selectedFiles = @('src/first.ts', 'src/second.ts'); partialFiles = @(); commitFileCount = 1 }
if (Test-CommitSelectionMatches $expected $changedCount) { throw 'A changed commit file count must invalidate the scope.' }

$source = [System.Text.Encoding]::UTF8.GetString($bridgeBytes, 3, $bridgeBytes.Length - 3)
$expectedMessage = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String(
  '7Y+s7Luk7Iqk66W8IOydtOuPme2VnCDrkqQgR2l0SHViIERlc2t0b3Ag7J6F66ClIOuCtOyaqeydtCDsnKDsp4DrkJjsp4Ag7JWK7JWY7Ja0LiBHZW1pbmkg6rKw6rO864qUIFJlcG9TaWRl7JeQIOuCqOyVhCDsnojslrQu'
))
$koreanMessage = $ast.FindAll({
  param($node)
  $node -is [System.Management.Automation.Language.StringConstantExpressionAst] -and
    $node.Value -ceq $expectedMessage
}, $true) | Select-Object -First 1
if (-not $koreanMessage) { throw 'The Korean post-focus failure message was not parsed correctly by Windows PowerShell 5.1.' }
$roundTrip = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String(
  [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($koreanMessage.Value))
))
if ($roundTrip -cne $koreanMessage.Value) { throw 'The Korean bridge message did not survive UTF-8 JSON transport.' }

Write-Output 'Windows PowerShell commit bridge fixtures passed.'
