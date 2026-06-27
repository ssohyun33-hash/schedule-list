import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy AI client initialization
function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: { 'User-Agent': 'aistudio-build' }
    }
  });
}

// Health route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Gemini AI Recurring & Smart Event Generator Endpoint
app.post('/api/gemini/recurring', async (req, res) => {
  try {
    const { prompt, currentDate } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    const ai = getAiClient();
    const systemInstruction = `You are an intelligent schedule and calendar planning assistant.
The user wants to generate schedule items from a natural language request, especially recurring rules like "every Friday: team lunch at 12:30" or "every 3rd of week: gym session at 17:00".
Current reference date: ${currentDate || new Date().toISOString().split('T')[0]}.

Analyze the user's prompt. If it describes a recurring event (e.g. every Friday, every Monday, every 3rd day of the week), calculate the exact calendar dates for the next 8 to 12 occurrences starting from or after the reference date. If it describes a single event or a list of specific events, generate those dates.

Return a JSON array of event objects.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.3,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          description: "List of calculated calendar schedule events",
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Short title of the event" },
              description: { type: Type.STRING, description: "Details or notes" },
              date: { type: Type.STRING, description: "Date in YYYY-MM-DD format" },
              time: { type: Type.STRING, description: "Time in 24h HH:mm format (e.g. 09:00 or 14:30)" },
              category: { 
                type: Type.STRING, 
                description: "Must be one of: work, personal, urgent, meeting"
              },
              recurrenceRule: { type: Type.STRING, description: "Summary of the rule, e.g. 'every Friday'" }
            },
            required: ["title", "date", "time", "category"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) {
      return res.status(500).json({ error: "Gemini returned empty response." });
    }

    const generatedEvents = JSON.parse(text);
    return res.json({ events: generatedEvents });
  } catch (error: any) {
    console.error("Error in /api/gemini/recurring:", error);
    return res.status(500).json({ 
      error: error.message || "Failed to generate schedule with Gemini." 
    });
  }
});

// Vite middleware or production static files
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Schedule List backend running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
