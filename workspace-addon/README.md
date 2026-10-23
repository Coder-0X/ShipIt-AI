# ShipIt AI - Google Workspace Add-on

This directory contains a Google Apps Script project that integrates ShipIt AI directly into Google Docs and Gmail as a sidebar add-on.

## How to Publish / Deploy

Because this runs on Google's infrastructure, you cannot simply run it locally. You must push it to Google Apps Script.

### Prerequisites

1. Install Google's CLI tool, `clasp`:
   ```bash
   npm install -g @google/clasp
   ```
2. Login to your Google account:
   ```bash
   clasp login
   ```
3. Enable the Google Apps Script API in your Google account settings: https://script.google.com/home/usersettings

### Deployment Steps

1. Navigate to this directory in your terminal.
2. Create a new Google Apps Script project:
   ```bash
   clasp create --type standalone --title "ShipIt AI Workspace Addon"
   ```
3. Push the code (`Code.gs`, `Sidebar.html`, `appsscript.json`) to Google's servers:
   ```bash
   clasp push
   ```
4. Open the project in your browser to test it:
   ```bash
   clasp open
   ```
   *In the Apps Script editor, click **Run** -> **Test as add-on** to see it appear inside a Google Doc.*

### Production Notes
- In `Code.gs`, update the `API_URL` to point to your production Next.js backend (e.g., `https://shipit-ai.example.com/api/generate`). Google Apps Script cannot connect to `localhost`.
- If you are testing locally, you must use a tool like **ngrok** to expose your `localhost:3000` server to the public internet, and paste the ngrok URL into `Code.gs`.
