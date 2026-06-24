const { GoogleGenAI, Type } = require("@google/genai");

async function test() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: "Ram paid 200",
      config: {
        systemInstruction: "You are an AI assistant.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            customerName: { type: Type.STRING },
            intent: { type: Type.STRING }
          },
          required: ["customerName", "intent"]
        }
      }
    });
    console.log(response.text);
  } catch (err) {
    console.error("ERROR!!", err);
  }
}

test();
