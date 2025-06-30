const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  console.error("❌ API_KEY not found in .env");
  process.exit(1);
}

const userHistories = {};

const staticResources = [
  {
    keywords: /fire\s?(evacuation|plan|safety)/i,
    reply: "Here's a downloadable fire safety guide:",
    followUps: [
      "What should I include in my emergency go-bag?",
      "How do I create a family communication plan?",
      "Where can I find nearby fire stations?"
    ],
    linkText: "🧯 Fire Safety Guide (PDF)",
    linkUrl: "https://dbhds.virginia.gov/assets/doc/OIH/fire-prevention-052019.pdf"
  },
  {
    keywords: /earthquake|tremor checklist/i,
    reply: "Here's an earthquake safety checklist you can download:",
    followUps: [
      "What should I do during an earthquake?",
      "How to secure furniture at home for earthquakes?",
      "Are there earthquake shelters in Indianapolis?"
    ],
    linkText: "📄 Earthquake Safety Checklist (PDF)",
    linkUrl: "https://www.ready.gov/sites/default/files/2024-03/ready.gov_earthquake_hazard-info-sheet.pdf"
  },
  {
    keywords: /flood|flooding/i,
    reply: "This flood safety guide can help you prepare and respond effectively:",
    followUps: [
      "How do I check flood zones in Indianapolis?",
      "What emergency supplies do I need for floods?",
      "How to protect electronics from flood damage?"
    ],
    linkText: "🌊 Flood Safety Guide (PDF)",
    linkUrl: "https://www.ready.gov/sites/default/files/2024-03/ready.gov_flood_hazard-info-sheet.pdf"
  },
  {
    keywords: /general preparedness|basic preparedness|emergency prep/i,
    reply: "Here's a general emergency preparedness guide:",
    followUps: [
      "How do I prepare a family disaster plan?",
      "What should be in a 72-hour emergency kit?",
      "How can I stay informed about local emergencies in Indianapolis?"
    ],
    linkText: "🧰 General Preparedness Guide (PDF)",
    linkUrl: "https://www.fema.gov/pdf/areyouready/basic_preparedness.pdf"
  }
];

app.post('/api/chat', async (req, res) => {
  const { message, userId = 'default', mode } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });

  try {
    // Static keyword match
    for (const resource of staticResources) {
      if (resource.keywords.test(message)) {
        userHistories[userId] = userHistories[userId] || [];
        userHistories[userId].push({ role: "user", parts: [{ text: message }] });
        userHistories[userId].push({ role: "model", parts: [{ text: resource.reply }] });

        return res.json({
          reply: `${resource.reply}\n\n[${resource.linkText}](${resource.linkUrl})`,
          followUps: resource.followUps
        });
      }
    }

    userHistories[userId] = userHistories[userId] || [];
    userHistories[userId].push({ role: "user", parts: [{ text: message }] });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

    const instruction = `You are SafetyBot, a Civic Tech assistant focused on public safety.

Only answer civic safety–related questions such as:
- Natural disaster guidance
- Suspicious activity reporting
- Local emergency preparedness
- Emergency contact information
- Public safety infrastructure

Do NOT answer unrelated questions like trivia, science facts, or general chat.

Keep all responses brief (under 150 words) and preferably in bullet points or steps.

Assume the user is located in Indianapolis, Indiana, unless explicitly stated otherwise.

Take into account the context mode (e.g., home, workplace, child) if provided.

After your main reply, think of 3 very relevant follow-up questions the user might ask next. Format your full JSON output like:
{
  "reply": "your actual answer",
  "followUps": ["question1", "question2", "question3"]
}`;

    const body = {
      contents: userHistories[userId],
      systemInstruction: {
        role: "system",
        parts: [{ text: `${instruction}\n\nCurrent context: ${mode || 'general'}` }]
      },
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 300
      }
    };

    const geminiRes = await axios.post(url, body);
    const raw = geminiRes.data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) throw new Error("No response from Gemini");

    let parsed = { reply: raw, followUps: [] };

    try {
      const match = raw.match(/{[\s\S]+?"followUps"\s*:\s*\[[\s\S]*?\]}/);
      if (match) {
        const json = JSON.parse(match[0]);
        parsed.reply = json.reply || raw;
        parsed.followUps = Array.isArray(json.followUps) ? json.followUps : [];
      }
    } catch (err) {
      console.warn("⚠️ JSON parsing failed. Using raw text only.", err.message);
    }

    userHistories[userId].push({ role: "model", parts: [{ text: parsed.reply }] });

    return res.json({
      reply: parsed.reply,
      followUps: parsed.followUps
    });

  } catch (err) {
    console.error("❌ Gemini API error:", err.response?.data || err.message);
    return res.status(500).json({ error: "Gemini backend error." });
  }
});

// For Render deployment
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
