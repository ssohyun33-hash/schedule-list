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

// Gemini AI Action Controller (Handles events, rooms, and modifications)
app.post('/api/gemini/action', async (req, res) => {
  try {
    const { prompt, currentDate, context } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    const ai = getAiClient();
    const systemInstruction = `You are an intelligent full-app orchestrator for a Schedule & Chat application.
Reference Date: ${currentDate || new Date().toISOString().split('T')[0]}.

You can perform the following actions:
1. CREATE_EVENTS: For specific or recurring events (e.g., "every Friday...").
2. CREATE_ROOM: Create a chat room and invite people by email.
3. DELETE_EVENTS: Identify events to remove based on title or date.
4. TOGGLE_EVENTS: Mark events as completed/done.

Current Context (Visible events/rooms):
${JSON.stringify(context || {})}

Analyze the user's natural language request. Return a JSON object with an 'actions' array.
Each action must have a 'type' (CREATE_EVENTS, CREATE_ROOM, DELETE_EVENTS, TOGGLE_EVENTS) and a 'payload'.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: "Brief explanation of what the AI is doing" },
            actions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, enum: ["CREATE_EVENTS", "CREATE_ROOM", "DELETE_EVENTS", "TOGGLE_EVENTS"] },
                  payload: {
                    type: Type.OBJECT,
                    properties: {
                      // For CREATE_EVENTS
                      events: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            title: { type: Type.STRING },
                            date: { type: Type.STRING },
                            time: { type: Type.STRING },
                            category: { type: Type.STRING },
                            recurrenceRule: { type: Type.STRING }
                          }
                        }
                      },
                      // For CREATE_ROOM
                      roomName: { type: Type.STRING },
                      invites: { type: Type.ARRAY, items: { type: Type.STRING } },
                      // For DELETE/TOGGLE
                      targetIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                      targetTitleMatch: { type: Type.STRING },
                      completed: { type: Type.BOOLEAN }
                    }
                  }
                },
                required: ["type", "payload"]
              }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty AI response");

    return res.json(JSON.parse(text));
  } catch (error: any) {
    console.error("Gemini Action Error:", error);
    return res.status(500).json({ error: error.message });
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
