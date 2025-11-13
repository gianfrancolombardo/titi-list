import { Item } from '../types';
import { OPENAI_PROMPTS } from '../prompts';

const CHAT_COMPLETIONS_URL = 'https://api.openai.com/v1/chat/completions';
const TRANSCRIPTIONS_URL = 'https://api.openai.com/v1/audio/transcriptions';
const WHISPER_MODEL = 'whisper-1';

const ensureApiKey = () => {
    if (!process.env.VITE_OPENAI_API_KEY) {
        throw new Error("VITE_OPENAI_API_KEY environment variable not set");
    }
    return process.env.VITE_OPENAI_API_KEY;
};

export const transcribeAudioWithOpenAI = async (
    audioBlob: Blob,
    options?: { signal?: AbortSignal }
): Promise<string> => {
    const apiKey = ensureApiKey();

    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');
    formData.append('model', WHISPER_MODEL);
    formData.append('language', 'es');
    formData.append('response_format', 'json');

    try {
        console.info('[OpenAI] Transcribing audio...', {
            size: audioBlob.size,
            type: audioBlob.type,
        });
        const response = await fetch(TRANSCRIPTIONS_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            },
            signal: options?.signal,
            body: formData,
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            console.error("OpenAI Whisper API Error:", errorBody);
            throw new Error(`OpenAI Whisper request failed with status ${response.status}`);
        }

        const data = await response.json();
        if (!data?.text || typeof data.text !== 'string') {
            throw new Error("Invalid transcription response from OpenAI.");
        }
        console.info('[OpenAI] Transcription successful', data.text);
        return data.text.trim();
    } catch (error) {
        console.error("Error transcribing audio with OpenAI:", error);
        throw new Error("Failed to transcribe audio with OpenAI.");
    }
};

const extractMessageText = (message: unknown): string | null => {
    if (!message || typeof message !== 'object') {
        return null;
    }

    const content = (message as { content?: unknown }).content;

    if (typeof content === 'string') {
        return content;
    }

    if (Array.isArray(content)) {
        const parts = content
            .map(part => {
                if (typeof part === 'string') {
                    return part;
                }
                if (part && typeof part === 'object' && 'text' in part && typeof part.text === 'string') {
                    return part.text;
                }
                return '';
            })
            .filter(Boolean);

        return parts.length > 0 ? parts.join('\n') : null;
    }

    return null;
};

export const processTranscriptWithOpenAI = async (transcript: string): Promise<Omit<Item, 'id' | 'done' | 'createdAt'>[] | null> => {
    const apiKey = ensureApiKey();

    try {
        const response = await fetch(CHAT_COMPLETIONS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-5-mini',
                messages: [
                    { role: 'system', content: OPENAI_PROMPTS.systemInstruction },
                    { role: 'user', content: transcript }
                ],
                tools: [OPENAI_PROMPTS.toolDefinition],
                tool_choice: { type: "function", function: { name: "add_list_items" } },
            })
        });

        if (!response.ok) {
            const errorBody = await response.json();
            console.error("OpenAI API Error:", errorBody);
            throw new Error(`OpenAI API request failed with status ${response.status}`);
        }

        const data = await response.json();
        console.info('[OpenAI] Chat completion tool call response', data);
        const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
        const messageText = extractMessageText(data.choices?.[0]?.message);
        if (messageText) {
            console.info('[OpenAI] Agent textual response', messageText);
        }

        if (toolCall && toolCall.function.name === 'add_list_items') {
            const args = JSON.parse(toolCall.function.arguments);
            console.info('[OpenAI] Parsed agent items', args);
            return Array.isArray(args.items) ? args.items : null;
        }
        
        return null;

    } catch (error) {
        console.error("Error processing transcript with OpenAI:", error);
        throw new Error("Failed to process request with OpenAI.");
    }
};
