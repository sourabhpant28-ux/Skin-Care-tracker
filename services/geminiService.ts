import { GoogleGenAI, Type } from "@google/genai";
import { RoutineStep } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const generateRoutineSuggestion = async (skinType: string, goals: string[]): Promise<any> => {
  if (!apiKey) {
    console.warn("No API Key provided");
    return [];
  }

  try {
    const prompt = `Create a simple skincare routine for someone with ${skinType} skin whose goals are: ${goals.join(', ')}. Return a JSON object with a list of suggested steps.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  productName: { type: Type.STRING },
                  time: { type: Type.STRING, enum: ['morning', 'night', 'both'] },
                  reason: { type: Type.STRING, description: "Why this product helps." }
                },
                required: ['productName', 'time', 'reason']
              }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) return { steps: [] };
    return JSON.parse(text);
  } catch (error) {
    console.error("Error generating routine:", error);
    return { steps: [] };
  }
};

export const analyzeSkinPhoto = async (base64Image: string, mimeType: string, notes: string): Promise<string> => {
  if (!apiKey) return "API Key missing. Cannot analyze.";
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: base64Image } },
          { text: `Analyze this skin photo in context of these notes: "${notes}". specific focus on visible skin health. Be brief and supportive.` }
        ]
      }
    });
    return response.text || "Could not analyze image.";
  } catch (error) {
    console.error("Error analyzing photo:", error);
    return "Error analyzing photo. Please try again.";
  }
};