
import { GoogleGenAI } from "@google/genai";

// Always use the process.env.API_KEY directly as per guidelines. 
// A new instance is created on each call to ensure the latest API key is used.
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getMedicationInsight = async (name: string, dose: string) => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide a very brief (max 2 sentences) tip for taking ${name} (${dose}). Focus on common advice like "take with food" or "avoid alcohol". Keep it professional and helpful.`,
    });
    return response.text;
  } catch (error) {
    console.error("AI Insight Error:", error);
    return "Remember to take as prescribed by your doctor.";
  }
};

export const getDailyHealthTip = async () => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "Provide a unique, one-sentence health tip for someone taking daily medications. Focus on hydration, consistency, safety, or general wellness. Make it encouraging and short.",
    });
    return response.text || "Consistency is the key to effective treatment. Stay on track!";
  } catch (error) {
    console.error("Daily Tip Error:", error);
    const fallbacks = [
      "Drink a full glass of water with your medication for better absorption.",
      "Try to take your medicine at the same time every day to build a habit.",
      "Keep a list of all your medications in your wallet for emergencies.",
      "Store your medications in a cool, dry place away from direct sunlight.",
      "Don't hesitate to ask your pharmacist if you have questions about side effects."
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
};

export const findNearbyPharmacies = async (lat: number, lng: number) => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-09-2025",
      contents: "List the top 5 pharmacies closest to my current location. Provide their names and website or map links if possible.",
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: lat,
              longitude: lng
            }
          }
        }
      },
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const results = chunks
      .filter((chunk: any) => chunk.maps)
      .map((chunk: any) => ({
        name: chunk.maps.title || "Nearby Pharmacy",
        uri: chunk.maps.uri,
      }));

    return results.length > 0 ? results : null;
  } catch (error) {
    console.error("Maps Grounding Error:", error);
    return null;
  }
};
