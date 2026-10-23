# Chrome Web Store Listing - ShipIt AI Everywhere

This document contains all the copy and metadata required to publish the "ShipIt AI - Everywhere" extension to the Chrome Web Store. 
**Do not delete or modify this file unless you are updating the store listing.**

## 1. Store Listing Copy

### Name
ShipIt AI - Everywhere

### Short Description (max 132 chars)
Rewrite text instantly with AI. Highlight messy notes on any page and turn them into professional copy for X, LinkedIn, or changelogs.

### Detailed Description
ShipIt AI acts as your personal technical copywriter, living directly inside your browser. 

Whether you are writing messy sprint notes in Jira, drafting a quick message in Slack, or reviewing a Pull Request on GitHub, ShipIt AI is just a right-click away.

**Features:**
*   **1-Click Rewrites:** Highlight any text on any webpage, right-click, and select "Rewrite with ShipIt AI".
*   **Tone Selection:** Instantly convert your text into a Hype (X/Twitter) thread, a Professional LinkedIn post, or a technical Markdown changelog.
*   **Persistent Side Panel:** The UI lives in Chrome's native Side Panel, meaning it doesn't obstruct your work and persists across tabs.
*   **Enterprise Grade AI:** Powered by the ShipIt AI Enterprise 4-Stage Reasoning Engine.

**How to use:**
1. Highlight text on any page.
2. Right-click and select "Rewrite with ShipIt AI" (or click the extension icon).
3. The Side Panel opens automatically. Select your desired tone and click "Rewrite".
4. Copy the generated text and paste it wherever you need.

*Note: You must have an active API Key from your ShipIt AI dashboard to use this extension.*

### Category
Productivity

---

## 2. Privacy & Data Use

### Data Collection Disclosure
- **Does your extension collect user data?** Yes.
- **What data do you collect?** 
  - **Website content (Text):** We only collect the specific text the user explicitly highlights and chooses to send to our service via the context menu. We DO NOT read all content on the pages you visit.
  - **Authentication information:** We store the user's ShipIt AI API Key locally to authenticate requests.

### Data Usage Policy
- The highlighted text is transmitted securely (via HTTPS) to the ShipIt AI backend (`https://your-production-url.com/api/generate`) strictly for the purpose of rewriting it using AI.
- We do not sell this data to third parties.
- We do not use this data for targeted advertising.
- We do not use this data for credit-worthiness or lending.

### Privacy Policy URL
`https://shipit-ai.example.com/privacy` *(Replace with actual URL before publishing)*

---

## 3. Permissions Justification

The Chrome Web Store review team strictly evaluates every permission requested in `manifest.json`. Below are the exact justifications you must paste into the Developer Dashboard.

### `sidePanel`
**Why is this needed?**
Required to display the main user interface. When the user highlights text and clicks the context menu item, the extension opens the side panel so the user can select their desired output tone and view the generated text without leaving their current tab.

### `contextMenus`
**Why is this needed?**
Required to add the "Rewrite with ShipIt AI" option to the browser's right-click menu. This is the primary way users interact with the extension, allowing them to send highlighted text from any webpage directly to the side panel for processing.

### `activeTab`
**Why is this needed?**
Required to temporarily access the current tab when the user clicks the extension action icon or uses the context menu, ensuring we can safely interact with the page they are actively focused on.

### `scripting`
**Why is this needed?**
Required to programmatically read the text the user has highlighted on the active page if they trigger the extension via a keyboard shortcut or action click instead of the context menu.

### `storage`
**Why is this needed?**
Required to persist the user's ShipIt AI API Key (so they don't have to log in every time) and to temporarily hold pending text data via `chrome.storage.session` while the side panel boots up.

### `host_permissions` (`<all_urls>`)
**Why is this needed?**
Required because users need to be able to rewrite text on *any* website they visit (e.g., Jira, GitHub, Slack, Gmail, internal company tools). Since we cannot predict which domains a user will need copywriting assistance on, we must request access to all URLs so the context menu functions globally.

---

## 4. Assets Checklist

Before submitting, ensure you have uploaded the following assets to the Developer Dashboard:

- [ ] **Store Icon:** 128x128px PNG.
- [ ] **Screenshots:** At least 1 (up to 5) screenshots of the extension in action. Size must be exactly 1280x800px or 640x400px.
- [ ] **Promo Tile:** 440x280px promotional image (optional but recommended).

---

## 5. Version History

- **v1.0.0 (Pending):** Initial release. Includes Context Menu integration, Side Panel UI, and API Key authentication.
