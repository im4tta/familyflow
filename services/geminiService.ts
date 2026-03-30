
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Parse natural language input into structured data for the app.
 */
export const parseQuickAction = async (input: string): Promise<any> => {
  try {
    // FIX: Initialize with process.env.API_KEY as per guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    
    const systemInstruction = `You are a data extractor for FamilyFlow. Parse the user input (English or Khmer) into a structured format for either an Expense or a Health Record.
    - For Expenses: need title, amount (number), category (Medical, Toys, Clothes, Food, Childcare, Subscription, Travel).
    - For Health: need title, type (Vaccine, Visit, Medication, Allergy, Illness, Grooming), and status (Scheduled, Completed, Active).
    - Default date is today: ${new Date().toISOString().split('T')[0]}.
    - If you are unsure of the category, pick the closest match.
    - Always return a 'type' field indicating if it's an 'Expense' or 'Health'.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: input,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            actionType: { 
              type: Type.STRING, 
              description: "Must be 'Expense' or 'Health'" 
            },
            data: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                amount: { type: Type.NUMBER, description: "Only for Expenses" },
                category: { type: Type.STRING, description: "Category for Expense or Type for Health" },
                status: { type: Type.STRING, description: "Only for Health" },
                date: { type: Type.STRING, description: "YYYY-MM-DD format" }
              }
            }
          },
          required: ["actionType", "data"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Parse Error:", error);
    return null;
  }
};

/**
 * Get AI advice for health or development queries.
 */
export const getAiAdvice = async (prompt: string, contextData: string, language: string = 'en'): Promise<string> => {
  try {
    // FIX: Initialize with process.env.API_KEY as per guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    
    const langInstruction = language === 'km' 
        ? " IMPORTANT: You must answer in Khmer language (Cambodian). Use professional yet warm tone." 
        : " Answer in English.";

    const systemInstruction = `You are FamilyFlow AI, a warm, expert pediatric assistant. 
    ${langInstruction}
    
    CRITICAL INSTRUCTION: DO NOT use markdown symbols like double asterisks (**) for bolding or any other symbols. 
    Use clear, simple text. Use empty lines between paragraphs for structure.
    Always remind users that AI advice is for informational purposes only.
    
    Current Context Data:
    ${contextData}
    
    Keep answers under 150 words.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
    });

    return response.text || "I couldn't generate a response at this moment.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return "Sorry, I'm having trouble connecting to the AI service. Please ensure your API key is correctly configured.";
  }
};

/**
 * Analyze data using structured JSON for the most reliable UI formatting.
 */
export const generateChildInsights = async (childData: any, language: string = 'en'): Promise<any> => {
  try {
    // FIX: Initialize with process.env.API_KEY as per guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

    const langInstruction = language === 'km' 
        ? "All text in the response object must be in Khmer language." 
        : "All text in the response object must be in English.";

    const prompt = `Analyze this child's development data and provide structured insights.
    ${langInstruction}
    
    Data:
    ${JSON.stringify(childData)}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            growthSummary: {
              type: Type.STRING,
              description: "Analysis of height/weight trends vs standard age groups.",
            },
            milestoneSummary: {
              type: Type.STRING,
              description: "Commentary on achieved vs expected progress.",
            },
            activities: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "2-3 specific suggested activities for the child.",
            },
            summary: {
              type: Type.STRING,
              description: "A warm, encouraging closing statement.",
            }
          },
          required: ["growthSummary", "milestoneSummary", "activities", "summary"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return result;
  } catch (error: any) {
    console.error("Insight Error:", error);
    return null;
  }
};
