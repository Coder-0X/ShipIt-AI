const apiKeyInput = document.getElementById('apiKey');
const apiUrlInput = document.getElementById('apiUrl');
const saveBtn = document.getElementById('saveBtn');
const statusDiv = document.getElementById('status');

// Load saved settings on startup
chrome.storage.sync.get(['shipitApiKey', 'shipitApiUrl'], (result) => {
  if (result.shipitApiKey) {
    apiKeyInput.value = result.shipitApiKey;
  }
  if (result.shipitApiUrl) {
    apiUrlInput.value = result.shipitApiUrl;
  }
});

// Save settings on click
saveBtn.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  const url = apiUrlInput.value.trim();
  
  const settings = { shipitApiKey: key };
  if (url) {
    settings.shipitApiUrl = url;
  }

  chrome.storage.sync.set(settings, () => {
    // Show success message
    statusDiv.style.display = 'block';
    statusDiv.innerText = 'Settings saved successfully!';
    
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 3000);
  });
});
