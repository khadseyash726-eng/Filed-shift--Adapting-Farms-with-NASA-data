import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

app.get("/api/health", (req, res) => {
  res.json({
    status: "online",
    gemini: ai ? "configured" : "missing_api_key",
    project: "JALVAYU360"
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    if (!ai) {
      return res.status(503).json({
        error: "Gemini API key is not configured. Add GEMINI_API_KEY to your environment."
      });
    }

    const { message, language = "English", history = [] } = req.body;

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Please enter a question." });
    }

    const safeHistory = Array.isArray(history)
      ? history.slice(-10).map(item => ({
          role: item.role === "model" ? "model" : "user",
          parts: [{ text: String(item.text || "").slice(0, 2000) }]
        }))
      : [];

    const prompt = `
You are JalVayu AI, the climate and agriculture assistant
for JALVAYU360, an innovation by TEAM AVIX.

Your responsibilities:
- Explain climate change and environmental issues.
- Help farmers understand rainfall, drought and crop planning.
- Explain water conservation and sustainable agriculture.
- Give practical, easy-to-understand answers.
- Support Indian users and Indian farming conditions.
- Never invent live weather measurements or claim to have
  accessed satellite data if you have not.
- Clearly distinguish general advice from verified live data.
- For dangerous weather or agricultural emergencies,
  recommend checking official government advisories.

Answer in this language: ${language}.
Understand Hindi, English and Hinglish questions.
Use simple language, useful headings and actionable advice.
Question: ${message.trim()}
`;

    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: [
        ...safeHistory,
        { role: "user", parts: [{ text: prompt }] }
      ]
    });

    res.json({
      reply: response.text || "I could not generate a response. Please try again."
    });

  } catch (error) {
    console.error("Gemini error:", error);
    res.status(500).json({
      error: "AI service is temporarily unavailable. Please try again."
    });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`JALVAYU360 running at http://localhost:${PORT}`);
  console.log(`Gemini: ${ai ? "Configured" : "API KEY REQUIRED"}`);
});