const quadrantDescription = `The Eisenhower matrix quadrant for 'todo' items. Evaluate urgency using explicit time cues (e.g., 'ahora', 'hoy', 'pronto', 'ya', 'esta noche'), problem severity (words like 'rompió', 'fuga', 'gotea', 'atascado', 'peligro'), and exposure to weather/security risks (e.g., 'ventana rota', 'puerta abierta', 'lluvia'). Evaluate importance by checking whether the task affects personal safety, the baby's immediate needs, the dog's wellbeing, or essential RV operations (electricity, water, waste, driving safety). Absence of urgency words or critical risk indicators usually means the task is not urgent.
- UrgentImportant: Immediate, critical tasks. Includes safety hazards ('ventana rota', 'piso resbaloso', 'alarma de gas'), urgent baby/dog needs ('pañales ya', 'perro vomitando'), essential RV functions failing ('batería descargada', 'fuga de gas', 'lluvia entra por techo'). Tasks for today or sooner.
- UrgentNotImportant: Interruptions needing quick attention but not vital to safety (e.g., 'responder mensaje del camping hoy', 'devolver llamada del mecánico').
- NotUrgentImportant: Planning, maintenance, or welfare improvements without immediate risk ('planificar ruta de la semana', 'pedir cita veterinario', 'revisar panel solar esta semana').
- NotUrgentNotImportant: Low-priority tasks that can be postponed indefinitely ('ordenar fotos', 'limpiar cajón decorativo').
This should be null for 'shopping' items.`;

export const GEMINI_PROMPTS = {
  systemInstruction: "You are an expert personal assistant for a family of four (a couple, a baby, and a dog) living in an RV. Your primary function is to analyze spoken requests in Spanish and categorize them into a structured JSON format. Pay extremely close attention to urgency cues ('hoy', 'ahora', 'pronto', 'ya', 'esta noche'), safety or damage indicators ('ventana rota', 'fuga', 'se rompió', 'lluvia entra', 'no cierra'), and importance factors tied to safety, the baby's needs, the dog's needs, and the RV's operational status. Classify tasks strictly: a safety risk or exposure to weather is always UrgentImportant. Always return a JSON array following the schema.",

  mainContent: (transcript: string) => `Analyze the following text, which is in Spanish, and create list items from it. The user's context is a family of four (couple, baby, dog) living and traveling in an RV. The output 'title' and 'note' should be in Spanish, as spoken by the user. The other fields must conform to the schema. Text: "${transcript}"`,

  schemaDescriptions: {
    type: "Classify as 'shopping' for purchasing items or 'todo' for actions.",
    title: "A short, clear title for the item. Be concise. Capitalize the first letter. For shopping items, use only the item name without verbs like 'comprar' (e.g., 'Leche' instead of 'comprar leche').",
    note: "Optional field. Only fill this if the information is absolutely essential for understanding the task. If provided, capitalize the first letter. Examples: 'Para el almuerzo', 'Llevar correa y bolsas'. If not essential, leave this field empty or null.",
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
