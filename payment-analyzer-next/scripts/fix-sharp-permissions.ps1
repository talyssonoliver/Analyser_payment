# Fix Sharp Permission Issues on Windows
Write-Host "Fixing Sharp package permissions..." -ForegroundColor Cyan

# Stop any running processes
Write-Host "Stopping any running Next.js processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# Clean build artifacts
Write-Host "Cleaning build artifacts..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue
}
if (Test-Path "out") {
    Remove-Item -Path "out" -Recurse -Force -ErrorAction SilentlyContinue
}
if (Test-Path "node_modules\.cache") {
    Remove-Item -Path "node_modules\.cache" -Recurse -Force -ErrorAction SilentlyContinue
}

# Remove sharp and related packages
Write-Host "Removing sharp package..." -ForegroundColor Yellow
if (Test-Path "node_modules\.pnpm\sharp@*") {
    Remove-Item -Path "node_modules\.pnpm\sharp@*" -Recurse -Force -ErrorAction SilentlyContinue
}
if (Test-Path "node_modules\sharp") {
    Remove-Item -Path "node_modules\sharp" -Recurse -Force -ErrorAction SilentlyContinue
}

# Reinstall sharp with correct permissions
Write-Host "Reinstalling sharp..." -ForegroundColor Yellow
pnpm install sharp --force

Write-Host "Done! You can now run 'pnpm build'" -ForegroundColor Green
