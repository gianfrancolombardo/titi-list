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
    console.info('[AI] Selected provider:', provider);

    switch (provider) {
        case 'gemini':
            return processTranscriptWithGemini(transcript);
        case 'openai':
            return processTranscriptWithOpenAI(transcript);
        case 'none':
            throw new Error("No AI API key found. Please set VITE_GEMINI_API_KEY (for Gemini) or VITE_OPENAI_API_KEY (for OpenAI).");
        default:
            throw new Error("Invalid AI provider specified.");
    }
};
