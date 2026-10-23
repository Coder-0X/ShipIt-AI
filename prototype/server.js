process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
// Serve static frontend files from current directory
app.use(express.static('.'));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/api/generate', async (req, res) => {
    try {
        const { commits, tone } = req.body;

        if (!commits) {
            return res.status(400).json({ error: "Commits are required" });
        }

        const prompt = `You are a world-class marketing copywriter for developers.
I am going to provide you with raw git commits/notes.
Your tone should be: ${tone}.

Generate 4 pieces of content based on these commits:
1. A Twitter thread. Use standard thread numbering like "1/" and "2/".
2. A professional LinkedIn post.
3. A Changelog entry formatted in Markdown.
4. A release update email to users.

Return the result as a raw JSON object with NO markdown wrapping or code blocks. The keys must be exactly: "twitter", "linkedin", "changelog", "email".
Ensure the values are plain strings (newlines \\n are fine).

Commits:
${commits}`;

        const response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: prompt,
            config: {
                temperature: 0.7,
                responseMimeType: "application/json"
            }
        });

        const text = response.text;
        const result = JSON.parse(text);
        
        res.json(result);
    } catch (error) {
        console.error("Error generating content:", error);
        res.status(500).json({ error: "Failed to generate content" });
    }
});

app.listen(port, () => {
    console.log(`ShipIt AI server running at http://localhost:${port}`);
});
