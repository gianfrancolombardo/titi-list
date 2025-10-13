import { GoogleGenAI, Type } from "@google/genai";
import { Item, ItemType, Quadrant } from '../types';
import { GEMINI_PROMPTS } from '../prompts';

const responseSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      type: {
        type: Type.STRING,
        enum: [ItemType.Shopping, ItemType.Todo],
        description: GEMINI_PROMPTS.schemaDescriptions.type
      },
      title: {
        type: Type.STRING,
        description: GEMINI_PROMPTS.schemaDescriptions.title
      },
      note: {
        type: Type.STRING,
        description: GEMINI_PROMPTS.schemaDescriptions.note
      },
      quantity: {
        type: Type.STRING,
        description: GEMINI_PROMPTS.schemaDescriptions.quantity
      },
      quadrant: {
        type: Type.STRING,
        enum: [Quadrant.UrgentImportant, Quadrant.UrgentNotImportant, Quadrant.NotUrgentImportant, Quadrant.NotUrgentNotImportant],
        description: GEMINI_PROMPTS.schemaDescriptions.quadrant
      }
    },
    required: ["type", "title"]
  }
};


export const processTranscriptWithGemini = async (transcript: string): Promise<Omit<Item, 'id' | 'done' | 'createdAt'>[] | null> => {
  // fix: Use process.env.API_KEY as per @google/genai guidelines to resolve TypeScript error.
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
  }
  // fix: Use process.env.API_KEY as per @google/genai guidelines to resolve TypeScript error.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: GEMINI_PROMPTS.mainContent(transcript),
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        systemInstruction: GEMINI_PROMPTS.systemInstruction
      },
    });

    const jsonText = response.text.trim();
    if (jsonText) {
      const parsed = JSON.parse(jsonText);
      return Array.isArray(parsed) ? parsed : null;
    }
    return null;

  } catch (error) {
    console.error("Error processing transcript with Gemini:", error);
    throw new Error("Failed to process request with AI.");
  }
};
