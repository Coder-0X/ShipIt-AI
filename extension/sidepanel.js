const inputText = document.getElementById('inputText');
const toneSelect = document.getElementById('toneSelect');
const generateBtn = document.getElementById('generateBtn');
const resultArea = document.getElementById('resultArea');
const resultContent = document.getElementById('resultContent');
const copyBtn = document.getElementById('copyBtn');

// Production default. Users can override this in the Options page.
const DEFAULT_API_URL = 'https://shipit-ai.example.com/api/generate';

// Will be set from storage on init
let API_URL = DEFAULT_API_URL;

// Handle incoming messages from the service worker (context menu clicks)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'rewrite_text' && message.text) {
    inputText.value = message.text;
  }
});

// Check if there's any pending text stored in session storage when we open
(async function init() {
  try {
    // Load custom API URL if user set one in Options
    const { shipitApiUrl } = await chrome.storage.sync.get('shipitApiUrl');
    if (shipitApiUrl) {
      API_URL = shipitApiUrl;
    }

    const { pendingRewrite } = await chrome.storage.session.get('pendingRewrite');
    if (pendingRewrite) {
      inputText.value = pendingRewrite;
      await chrome.storage.session.remove('pendingRewrite');
    }
  } catch (err) {
    console.error('Session storage not available in this context:', err);
  }
})();

generateBtn.addEventListener('click', async () => {
  const text = inputText.value.trim();
  if (!text) return;

  const tone = toneSelect.value;
  
  generateBtn.disabled = true;
  generateBtn.innerText = 'Rewriting...';
  resultArea.style.display = 'none';

  try {
    // Retrieve API Key from storage
    const storageResult = await chrome.storage.sync.get(['shipitApiKey']);
    const apiKey = storageResult.shipitApiKey;
    
    if (!apiKey) {
      throw new Error('API Key is missing. Please right-click the extension icon and select "Options" to configure it.');
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ commits: text, tone, customTone: '' })
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const data = await response.json();
    
    // Determine which field to pick based on tone
    let finalOutput = '';
    if (tone === 'hype') finalOutput = data.twitter;
    else if (tone === 'pro') finalOutput = data.linkedin;
    else if (tone === 'tech') finalOutput = data.changelog;
    else finalOutput = data.twitter || data.linkedin || data.changelog || data.email;

    resultContent.value = finalOutput;
    resultArea.style.display = 'block';
  } catch (err) {
    console.error('Generation failed:', err);
    resultContent.value = `Error: Could not connect to API.\n${err.message}\nMake sure localhost:3000 is running.`;
    resultArea.style.display = 'block';
  } finally {
    generateBtn.disabled = false;
    generateBtn.innerText = 'Rewrite Text';
  }
});

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(resultContent.value);
    const originalText = copyBtn.innerText;
    copyBtn.innerText = 'Copied!';
    setTimeout(() => {
      copyBtn.innerText = originalText;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy', err);
  }
});
