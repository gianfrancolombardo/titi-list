import { Item } from '../types';
import { processTranscriptWithGemini } from './geminiService';
import { processTranscriptWithOpenAI } from './openaiService';

export type AiProvider = 'gemini' | 'openai' | 'none';

export const getAiProvider = (): AiProvider => {
    if (process.env.API_KEY) {
        return 'gemini';
    }
    if (process.env.OPENAI_API_KEY) {
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
            throw new Error("No AI API key found. Please set API_KEY (for Gemini) or OPENAI_API_KEY.");
        default:
            throw new Error("Invalid AI provider specified.");
    }
};
