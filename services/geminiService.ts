
import { GoogleGenAI, Type } from "@google/genai";

const API_KEY = import.meta.env?.VITE_GEMINI_API_KEY as string | undefined;

const getAi = () => new GoogleGenAI({ apiKey: API_KEY as string });

export async function simulateDataSync(currentProducts: any[]) {
  if (!API_KEY) return [];
  
  try {
    const ai = getAi();
    const productNames = currentProducts.map(p => p.name).join(", ");
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Simule un scraper de prix pour les supermarchés marocains (Marjane, Carrefour, BIM, Aswak Assalam). 
      Pour ces produits : [${productNames}], génère des prix mis à jour (fluctuation de +/- 5%).
      Retourne un tableau JSON d'objets : {id, prices: {marjane, carrefour, bim, aswak}}. 
      Important : 'aswak' doit correspondre exactement au prix de 'Aswak Assalam'.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              prices: {
                type: Type.OBJECT,
                properties: {
                  marjane: { type: Type.NUMBER },
                  carrefour: { type: Type.NUMBER },
                  bim: { type: Type.NUMBER },
                  aswak: { type: Type.NUMBER }
                }
              }
            }
          }
        }
      }
    });
    
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Sync Error:", error);
    return [];
  }
}

export async function parseGroceryList(rawText: string) {
  if (!API_KEY || !rawText.trim()) return [];
  try {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyse cette liste de courses : "${rawText}". Extrais uniquement les noms de produits. Retourne un tableau JSON de chaînes de caractères.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (e) {
    return [];
  }
}

export async function getSmartSearchSuggestions(query: string) {
    if (!API_KEY || query.length < 2) return [];
    try {
        const ai = getAi();
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `L'utilisateur recherche "${query}" dans une application de courses au Maroc. Suggère 5 noms de produits ou marques très spécifiques (ex: Lesieur, Centrale Danone, Dari, etc). Retourne un tableau JSON de chaînes.`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        });
        return JSON.parse(response.text || "[]");
    } catch (e) {
        return [];
    }
}
