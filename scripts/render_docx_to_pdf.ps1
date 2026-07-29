param(
  [Parameter(Mandatory = $true)][string]$InputPath,
  [Parameter(Mandatory = $true)][string]$OutputPath
)

$word = $null
$document = $null
try {
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $document = $word.Documents.Open($InputPath, $false, $true)
  $document.SaveAs([ref]$OutputPath, [ref]17)
} finally {
  if ($null -ne $document) { $document.Close() }
  if ($null -ne $word) { $word.Quit() }
}
