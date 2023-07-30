# Function to relaunch the script with elevated permissions
function Restart-ScriptElevated {
    # Create an elevation command
    $elevatedCmd = "Start-Process powershell.exe -Verb RunAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File ""$PSCommandPath""'"

    # Request elevation and relaunch the script
    Start-Process -FilePath "powershell.exe" -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -Command $elevatedCmd"
    Exit
}

# Check if the script is running with administrator privileges
if (-Not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    # If not, relaunch the script with elevated permissions
    Restart-ScriptElevated
}

# Define the URLs
$codeArenaUrl = "https://codeio.club/links/CodeArena_desktop.txt"
$codeIOProgramFilesUrl = "https://codeio.club/links/CodeIO_program_files.txt"

# Define paths for downloads and extraction
$desktopPath = [Environment]::GetFolderPath("Desktop")
$programFilesPath = [Environment]::GetFolderPath("ProgramFiles")
$ProgressPreference = 'SilentlyContinue'

# Function to download and extract the ZIP file
function DownloadAndExtractZip {
    param(
        [string]$url,
        [string]$outputPath
    )

    $tempZipFile = "$outputPath\temp.zip"

    # Download the ZIP file
    Invoke-WebRequest -Uri $url -OutFile $tempZipFile

    # Extract the contents of the ZIP file
    Expand-Archive -Path $tempZipFile -DestinationPath $outputPath -Force

    # Remove the temporary ZIP file
    Remove-Item $tempZipFile
}

Write-Host "Downloading.."

# Step 1: Get the download URLs from the provided links
$codeArenaDownloadLink = Invoke-WebRequest -Uri $codeArenaUrl | Select-Object -ExpandProperty Content
$codeIOProgramFilesDownloadLink = Invoke-WebRequest -Uri $codeIOProgramFilesUrl | Select-Object -ExpandProperty Content

# Step 2: Download and extract the files
DownloadAndExtractZip $codeArenaDownloadLink $desktopPath
DownloadAndExtractZip $codeIOProgramFilesDownloadLink $programFilesPath

# Output a message indicating success
Write-Host "CodeArena.zip has been downloaded and extracted to the desktop."
Write-Host "CodeIO_program_files.zip has been downloaded and extracted to Program Files."

Read-Host -Prompt "Press Enter to exit"