$file = "c:\Users\My Pc\Documents\Lokalv2\src\app\pages\rank-role.tsx"
$content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)

# Each replacement: mojibake bytes decoded as latin-1 -> correct UTF-8 char
# Crown emoji: ðŸ'' (U+1F451) -> 👑
$content = $content.Replace("ðŸ''", [System.Char]::ConvertFromUtf32(0x1F451))
# En-dash: â€" (U+2013) -> –
$content = $content.Replace("â€"", [char]0x2013)
# Infinity: âˆž (U+221E) -> ∞
$content = $content.Replace("âˆž", [char]0x221E)
# Check mark: âœ" (U+2713) -> ✓
$content = $content.Replace("âœ"", [char]0x2713)
# Frame picture: ðŸ–¼ (U+1F5BC) -> 🖼
$content = $content.Replace("ðŸ–¼", [System.Char]::ConvertFromUtf32(0x1F5BC))

[System.IO.File]::WriteAllText($file, $content, (New-Object System.Text.UTF8Encoding $false))
Write-Host "Done - all broken chars fixed"
