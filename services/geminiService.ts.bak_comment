
import { GoogleGenAI } from "@google/genai";

// Always initialize with process.env.API_KEY directly as a named parameter
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getDiagnosticHelp = async (device: string, issue: string, base64Image?: string): Promise<string> => {
  try {
    const ai = getAI();
    const contents: any[] = [{ text: `Device: ${device}. Issue: ${issue}. Provide a direct technical verdict.` }];
    
    if (base64Image) {
      contents.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Image.split(',')[1] || base64Image,
        },
      });
    }

    const response = await ai.models.generateContent({
      model: base64Image ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview',
      contents: { parts: contents },
      config: {
        systemInstruction: "You are Pulse AI. Provide extremely concise, professional technical diagnoses for Black Box engineers. DO NOT use conversational filler. GO STRAIGHT TO THE POINT. Identify the likely failing component and estimated repair complexity in 2 sentences max.",
      }
    });
    // Use .text property to extract output
    return response.text || "Diagnostic complete. Hardware failure suspected.";
  } catch (error) {
    console.error("AI Error:", error);
    return "Diagnostic offline. Manual inspection required.";
  }
};

export const chatWithGemini = async (history: {role: string, parts: {text: string}[]}[], prompt: string): Promise<string> => {
  try {
    const ai = getAI();
    // Pass existing history to the chat session for contextual awareness
    const chat = ai.chats.create({
      model: 'gemini-3-pro-preview',
      history: history as any,
      config: {
        systemInstruction: "You are 'Pulse', the official AI assistant for Black Box, Kumasi. You are elite, minimalist, and direct. Answer questions about tech sales and repairs briefly. No small talk. Keep responses under 50 words.",
      },
    });
    
    const response = await chat.sendMessage({ message: prompt });
    // Use .text property to extract output
    return response.text || "I'm Pulse. How can I assist with your hardware?";
  } catch (error) {
    console.error("Chat Error:", error);
    return "Pulse synchronization error. Visit our branch at KNUST.";
  }
};
