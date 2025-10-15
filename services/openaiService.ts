import { Item } from '../types';
import { OPENAI_PROMPTS } from '../prompts';

const API_URL = '/api/openai/v1/chat/completions';

export const processTranscriptWithOpenAI = async (transcript: string): Promise<Omit<Item, 'id' | 'done' | 'createdAt'>[] | null> => {
    // fix: Use process.env to access environment variables to resolve TypeScript error.
    if (!process.env.VITE_OPENAI_API_KEY) {
        throw new Error("VITE_OPENAI_API_KEY environment variable not set");
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // fix: Use process.env to access environment variables to resolve TypeScript error.
                'Authorization': `Bearer ${process.env.VITE_OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
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
        const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

        if (toolCall && toolCall.function.name === 'add_list_items') {
            const args = JSON.parse(toolCall.function.arguments);
            return Array.isArray(args.items) ? args.items : null;
        }
        
        return null;

    } catch (error) {
        console.error("Error processing transcript with OpenAI:", error);
        throw new Error("Failed to process request with OpenAI.");
    }
};
