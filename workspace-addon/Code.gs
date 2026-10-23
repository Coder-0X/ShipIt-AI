const API_URL = 'https://your-production-url.com/api/generate'; // In dev, you must use something like ngrok because Apps Script runs in Google's cloud

/**
 * Triggered when the user opens the add-on in Google Docs.
 */
function onDocsHomepage(e) {
  // Rather than building UI with CardService which can be rigid,
  // we can use a custom HTML sidebar for a better UX.
  // We'll return an action that opens the HTML sidebar.
  
  // Create a button that opens our HTML sidebar
  var button = CardService.newTextButton()
      .setText("Open ShipIt AI")
      .setOnClickAction(CardService.newAction().setFunctionName("openSidebar"));
      
  var section = CardService.newCardSection()
      .addWidget(CardService.newTextParagraph().setText("Rewrite your messy sprint notes directly in Google Docs."))
      .addWidget(button);
      
  var card = CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader().setTitle("ShipIt AI Workspace"))
      .addSection(section)
      .build();
      
  return card;
}

function openSidebar() {
  var html = HtmlService.createHtmlOutputFromFile('Sidebar')
      .setTitle('ShipIt AI')
      .setWidth(300);
      
  DocumentApp.getUi().showSidebar(html);
}

/**
 * Gets the selected text in the active document.
 */
function getSelectedText() {
  var doc = DocumentApp.getActiveDocument();
  var selection = doc.getSelection();
  
  if (selection) {
    var text = [];
    var elements = selection.getRangeElements();
    for (var i = 0; i < elements.length; i++) {
      if (elements[i].getElement().editAsText) {
        text.push(elements[i].getElement().asText().getText());
      }
    }
    return text.join('\n');
  } else {
    // If no selection, grab the whole document text
    return doc.getBody().getText();
  }
}

/**
 * Calls the ShipIt AI API and appends the result to the document.
 */
function generateAndAppend(tone) {
  var apiKey = PropertiesService.getUserProperties().getProperty('SHIPIT_API_KEY');
  
  if (!apiKey) {
    return { success: false, message: 'API Key is missing. Please click Settings to configure.' };
  }

  var text = getSelectedText();
  
  if (!text || text.trim() === '') {
    return { success: false, message: 'No text found to rewrite.' };
  }
  
  var payload = {
    commits: text,
    tone: tone,
    customTone: ''
  };
  
  var options = {
    'method': 'post',
    'contentType': 'application/json',
    'headers': {
      'Authorization': 'Bearer ' + apiKey
    },
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true
  };
  
  try {
    var response = UrlFetchApp.fetch(API_URL, options);
    var responseCode = response.getResponseCode();
    var responseBody = JSON.parse(response.getContentText());
    
    if (responseCode === 200) {
      var outputText = '';
      if (tone === 'hype') outputText = responseBody.twitter;
      else if (tone === 'pro') outputText = responseBody.linkedin;
      else if (tone === 'tech') outputText = responseBody.changelog;
      else outputText = responseBody.email;
      
      if (!outputText) {
        return { success: false, message: 'API returned empty content.' };
      }
      
      // Append the text to the bottom of the document
      var doc = DocumentApp.getActiveDocument();
      var body = doc.getBody();
      
      body.appendHorizontalRule();
      body.appendParagraph("ShipIt AI (" + tone + "):").setHeading(DocumentApp.ParagraphHeading.HEADING3);
      body.appendParagraph(outputText);
      
      return { success: true };
    } else {
      return { success: false, message: 'API Error: ' + (responseBody.error || responseCode) };
    }
  } catch (e) {
    return { success: false, message: 'Network Error: ' + e.message + '. (Are you using localhost? Apps Script cannot reach localhost, use ngrok)' };
  }
}


/**
 * Settings Management
 */
function openSettings() {
  var html = HtmlService.createHtmlOutputFromFile('Settings')
      .setTitle('ShipIt AI Settings')
      .setWidth(300);
  DocumentApp.getUi().showSidebar(html);
}

function saveApiKey(key) {
  PropertiesService.getUserProperties().setProperty('SHIPIT_API_KEY', key);
  return { success: true };
}

function getApiKey() {
  return PropertiesService.getUserProperties().getProperty('SHIPIT_API_KEY') || '';
}

