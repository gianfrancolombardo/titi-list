import { Item } from '../types';
import { processTranscriptWithGemini } from './geminiService';
import { processTranscriptWithOpenAI } from './openaiService';

export type AiProvider = 'gemini' | 'openai' | 'none';

export const getAiProvider = (): AiProvider => {
    // Fix: Use import.meta.env for Vite environment variables
    if (import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY) {
        return 'gemini';
    }
    if (import.meta.env.VITE_OPENAI_API_KEY) {
        return 'openai';
    }
    return 'none';
};

export const processTranscript = async (transcript: string): Promise<Omit<Item, 'id' | 'done' | 'createdAt'>[] | null> => {
    const provider = getAiProvider();

    switch (provider) {
        case 'gemini':
            console.log("Using Gemini API");
            return processTranscriptWithGemini(transcript);
        case 'openai':
            console.log("Using OpenAI API");
            return processTranscriptWithOpenAI(transcript);
        case 'none':
            console.error("No AI provider API key configured.");
            // Fix: Update error message to reflect correct environment variable names
            throw new Error("No AI API key found. Please set VITE_GEMINI_API_KEY (for Gemini) or VITE_OPENAI_API_KEY (for OpenAI).");
        default:
            throw new Error("Invalid AI provider specified.");
    }
};
