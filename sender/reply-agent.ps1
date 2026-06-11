# Daily reply triage: fetch new inbox replies; if any, let a headless
# Claude agent (Opus, deep thinking) judge and act on them.
# Token-frugal: the agent only runs when there ARE new replies.

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

node check-replies.js | Tee-Object -Variable fetchOut
$pendingFile = Join-Path $PSScriptRoot "replies-pending.json"

$count = 0
if (Test-Path $pendingFile) {
    $count = (Get-Content $pendingFile -Raw | ConvertFrom-Json).Count
}

if ($count -eq 0) {
    Write-Output "No pending replies - agent not started (0 tokens spent)."
    exit 0
}

Write-Output "Running triage agent on $count pending repl(y/ies)..."
$prompt = Get-Content (Join-Path $PSScriptRoot "reply-agent-prompt.md") -Raw

# Locked-down tool scope (NOT skip-permissions): the agent reads untrusted
# email text, so it gets ONLY the tools it needs. No arbitrary Bash, no way
# to read .env or send email even if a reply attempts prompt-injection.
# The single allowed command is remove-prospect.js; worst case = a wrongly
# removed prospect (recoverable), never code execution or credential access.
$allowed = 'Read,Edit,Write,Bash(node remove-prospect.js:*),Bash(node add-active.js:*)'

claude -p $prompt --model claude-opus-4-8 --max-turns 20 `
    --allowedTools $allowed --add-dir $PSScriptRoot `
    2>&1 | Tee-Object -FilePath (Join-Path $PSScriptRoot "agent-last-run.log")
