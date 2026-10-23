const fs = require('fs'); 
const env = fs.readFileSync('.env.local', 'utf8'); 
const key = env.split('=')[1].trim(); 
const { GoogleGenAI } = require('@google/genai'); 
const ai = new GoogleGenAI({apiKey: key}); 
(async () => { 
  const modelsToTest = [
    'gemini-3.8-flash', 
    'gemini-3.7-flash', 
    'gemini-3.6-flash', 
    'gemini-3.5-flash', 
    'gemini-2.5-flash', 
    'gemini-2.5-pro', 
    'gemini-3.1-pro-preview'
  ]; 
  console.log('Testing models...'); 
  for (const m of modelsToTest) { 
    try { 
      const start = Date.now(); 
      await ai.models.generateContent({model: m, contents: 'Say hi'}); 
      console.log('[OK] ' + m + ' - ' + (Date.now() - start) + 'ms'); 
    } catch(e) { 
      console.log('[ERR] ' + m + ' - ' + (e.status || e.message)); 
    } 
  } 
})();
