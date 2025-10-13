const quadrantDescription = `The Eisenhower matrix quadrant for 'todo' items. Critically evaluate the user's words for urgency (e.g., 'ahora', 'hoy', 'pronto', 'se rompió', 'ya') and importance based on the family's context (RV travel with a baby and dog).
- UrgentImportant: Immediate, critical tasks. Safety issues (e.g., 'revisar el freno'), baby/dog needs (e.g., 'comprar pañales ya'), essential RV functions (e.g., 'buscar dónde dormir esta noche', 'el tanque de agua está vacío'). Tasks for today.
- UrgentNotImportant: Interruptions needing quick attention but not vital (e.g., 'contestar email del camping', 'lavar la ropa').
- NotUrgentImportant: Planning, maintenance, long-term goals (e.g., 'planificar la ruta de la semana que viene', 'pedir hora para el veterinario').
- NotUrgentNotImportant: Low-priority tasks that can be postponed (e.g., 'organizar las fotos del viaje').
This should be null for 'shopping' items.`;

export const GEMINI_PROMPTS = {
  systemInstruction: "You are an expert personal assistant for a family of four (a couple, a baby, and a dog) living in an RV. Your primary function is to analyze spoken requests in Spanish and categorize them into a structured JSON format. Pay extremely close attention to words indicating urgency ('hoy', 'ahora', 'pronto', 'ya', 'se rompió') and importance related to the family's safety, the baby's needs, the dog's needs, and the RV's operational status. Your categorization must be strict and accurate. Always return a JSON array following the schema.",

  mainContent: (transcript: string) => `Analyze the following text, which is in Spanish, and create list items from it. The user's context is a family of four (couple, baby, dog) living and traveling in an RV. The output 'title' and 'note' should be in Spanish, as spoken by the user. The other fields must conform to the schema. Text: "${transcript}"`,

  schemaDescriptions: {
    type: "Classify as 'shopping' for purchasing items or 'todo' for actions.",
    title: "A short, clear title for the item. Be concise.",
    note: "Optional details, context, or notes. Keep it brief.",
    quantity: "Optional quantity for 'shopping' items (e.g., '2 liters', '1 dozen').",
    quadrant: quadrantDescription
  }
};

export const OPENAI_PROMPTS = {
  systemInstruction: GEMINI_PROMPTS.systemInstruction,
  toolDefinition: {
      type: "function" as const,
      function: {
          name: "add_list_items",
          description: "Adds one or more items to the user's shopping or to-do list based on a user's voice transcript.",
          parameters: {
              type: "object",
              properties: {
                  items: {
                      type: "array",
                      items: {
                          type: "object",
                          properties: {
                              type: {
                                  type: "string",
                                  enum: ["shopping", "todo"],
                                  description: GEMINI_PROMPTS.schemaDescriptions.type
                              },
                              title: {
                                  type: "string",
                                  description: GEMINI_PROMPTS.schemaDescriptions.title
                              },
                              note: {
                                  type: "string",
                                  description: GEMINI_PROMPTS.schemaDescriptions.note
                              },
                              quantity: {
                                  type: "string",
                                  description: GEMINI_PROMPTS.schemaDescriptions.quantity
                              },
                              quadrant: {
                                  type: "string",
                                  enum: ['UrgentImportant', 'UrgentNotImportant', 'NotUrgentImportant', 'NotUrgentNotImportant'],
                                  description: quadrantDescription
                              }
                          },
                          required: ["type", "title"]
                      }
                  }
              },
              required: ["items"]
          }
      }
  }
};
