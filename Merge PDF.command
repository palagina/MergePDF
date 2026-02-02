#!/bin/bash
# PDF Merger - Quick Launch
# Double-click this file to open PDF Merger in your browser

# Get the directory where this script is located
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Open the PDF merger in default browser
open "$DIR/app/pdf_merger.html"

# Close the terminal window
osascript -e 'tell application "Terminal" to close first window' &
exit
