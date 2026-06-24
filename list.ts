import { GoogleGenAI } from '@google/genai';
async function run() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const res = await ai.models.listModels();
  for await (const model of res) {
    console.log(model.name)
  }
}
run().catch(console.error);