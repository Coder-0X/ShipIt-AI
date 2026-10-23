// Configure side panel to open when extension icon is clicked
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);

// Set up context menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'shipit-ai-rewrite',
    title: 'Rewrite with ShipIt AI',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'shipit-ai-rewrite') {
    // Open the side panel first
    await chrome.sidePanel.open({ windowId: tab.windowId });
    
    // Give it a tiny moment to load if it hasn't already
    setTimeout(async () => {
      // Send the selected text to the side panel
      try {
        await chrome.runtime.sendMessage({
          action: 'rewrite_text',
          text: info.selectionText
        });
      } catch (err) {
        console.warn('Side panel might still be booting up', err);
        // Fallback: save to storage so side panel can read it on mount
        await chrome.storage.session.set({ pendingRewrite: info.selectionText });
      }
    }, 500);
  }
});
