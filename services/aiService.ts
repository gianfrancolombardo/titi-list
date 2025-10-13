import { Item } from '../types';
import { processTranscriptWithGemini } from './geminiService';
import { processTranscriptWithOpenAI } from './openaiService';

export type AiProvider = 'gemini' | 'openai' | 'none';

export const getAiProvider = (): AiProvider => {
    // fix: Use process.env to access environment variables, resolving TypeScript error.
    if (process.env.API_KEY) {
        return 'gemini';
    }
    // fix: Use process.env to access environment variables, resolving TypeScript error.
    if (process.env.VITE_OPENAI_API_KEY) {
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
            // fix: Update error message to reflect use of process.env.API_KEY for Gemini.
            throw new Error("No AI API key found. Please set API_KEY (for Gemini) or VITE_OPENAI_API_KEY.");
        default:
            throw new Error("Invalid AI provider specified.");
    }
};
