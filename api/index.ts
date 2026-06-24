import express from "express";
import { GoogleGenAI, Type } from "@google/genai";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

// Initialize Gemini
let ai: GoogleGenAI | null = null;
function getAI() {
  if (!ai) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("GEMINI_API_KEY environment variable is required");
      return null;
    }
    ai = new GoogleGenAI({ apiKey: key });
  }
  return ai;
}

app.post("/api/chat", async (req, res) => {
  try {
    const { message, history } = req.body;
    const aiClient = getAI();
    if (!aiClient) {
      return res.status(500).json({ error: "Gemini API key is not configured" });
    }

    const response = await aiClient.models.generateContent({
      model: "gemini-2.5-flash",
      contents: message,
      config: {
        systemInstruction: `You are an AI assistant for a local Indian grocery store called "Aashirwad Stores".
Your job is to parse the shopkeeper's natural language input (Hindi or English) to extract intent and customer details.
Supported intents:
- "udhari": Customer takes goods on credit (e.g., "Rahul 500 udhar")
- "paid": Customer paid money (e.g., "Rahul ne 300 pay kiya")
- "query_balance": Ask for balance (e.g., "Deepak remaining kitna", "Rahul ka balance")
- "send_reminder": Ask to send SMS reminder (e.g., "Umesh ko reminder bhejo")

You must output ONLY valid JSON using the provided schema. Do not output markdown code blocks.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            customerName: { type: Type.STRING, description: "The name of the customer." },
            mobile: { type: Type.STRING, description: "The mobile number of the customer, if provided." },
            intent: { type: Type.STRING, enum: ["paid", "udhari", "query_balance", "send_reminder"], description: "The recognized intent." },
            amount: { type: Type.NUMBER, description: "The amount of the transaction, if applicable." },
            description: { type: Type.STRING, description: "Any additional details or items purchased." }
          },
          required: ["customerName", "intent"]
        }
      }
    });

    if (response.text) {
      try {
        const parsed = JSON.parse(response.text);
        res.json({ result: parsed });
      } catch (e) {
        res.status(500).json({ error: "Failed to parse AI response" });
      }
    } else {
      res.status(500).json({ error: "No response from AI" });
    }

  } catch (error: any) {
    let errorMsg = error.message || "Failed to process chat";
    
    try {
      const parsedError = JSON.parse(error.message.replace(/^\[.*?\] /, ''));
      if (parsedError.error && parsedError.error.message) {
        errorMsg = parsedError.error.message;
      }
    } catch (e) {
      if (errorMsg.includes('{"error"')) {
        try {
          const match = errorMsg.match(/\{"error".*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            if (parsed.error && parsed.error.message) {
              errorMsg = parsed.error.message;
            }
          }
        } catch (e2) {}
      }
    }

    if (error.status === 503 || errorMsg.includes("503") || errorMsg.includes("high demand") || errorMsg.includes("UNAVAILABLE")) {
       console.warn("Chat API: High demand (503)");
       return res.status(503).json({ error: "The AI model is currently experiencing high demand. Please try again in a moment." });
    }
    
    console.error("Chat API error:", error);
    res.status(500).json({ error: errorMsg });
  }
});

app.post("/api/sms", async (req, res) => {
  try {
    const { number, message } = req.body;
    const apiKey = process.env.FAST2SMS_API_KEY;
    
    if (!apiKey) {
      console.log(`[SIMULATED SMS] To: ${number}, Message: ${message}`);
      return res.json({ success: true, simulated: true });
    }

    const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
      method: "POST",
      headers: {
        "authorization": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        route: "v3",
        sender_id: "TXTIND",
        message: message,
        language: "english",
        flash: 0,
        numbers: number
      })
    });

    const data = await response.json();
    res.json({ success: true, data });

  } catch (error: any) {
    console.error("SMS API error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default app;
