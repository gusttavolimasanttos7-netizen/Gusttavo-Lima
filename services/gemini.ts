
import { GoogleGenAI, Type } from "@google/genai";
import { PlayerStats, DungeonEncounter, InventoryItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateDungeon = async (stats: PlayerStats): Promise<DungeonEncounter> => {
  const prompt = `Gere um encontro de masmorra no estilo Solo Leveling para um jogador de Nível ${stats.level}. 
  Responda em PORTUGUÊS BRASILEIRO.
  Inclua um ranking (E a S), um nome épico para a masmorra, um nome aterrorizante para o chefe, uma descrição curta e 3 possíveis recompensas.
  Defina também o bossMaxHp baseado no nível ${stats.level} (aproximadamente ${stats.level * 1000} para Rank C).`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          rank: { type: Type.STRING },
          boss: { type: Type.STRING },
          description: { type: Type.STRING },
          rewards: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          bossMaxHp: { type: Type.NUMBER }
        },
        required: ["name", "rank", "boss", "description", "rewards", "bossMaxHp"]
      }
    }
  });

  try {
    const data = JSON.parse(response.text);
    return { 
      ...data, 
      bossHp: data.bossMaxHp, 
      bossEffects: [] 
    };
  } catch (e) {
    throw new Error("Falha ao analisar dados da masmorra");
  }
};

export const generateLoot = async (rank: string): Promise<InventoryItem> => {
  const prompt = `Gere um item de saque aleatório para uma masmorra de Solo Leveling de rank ${rank}. 
  Responda em PORTUGUÊS BRASILEIRO.
  Inclua nome, um título curto e impactante (como 'Lâmina do Abismo'), raridade (${rank}), tipo (ARMA, ARMADURA, CONSUMÍVEL), e uma descrição épica.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          title: { type: Type.STRING },
          rarity: { type: Type.STRING },
          type: { type: Type.STRING },
          description: { type: Type.STRING }
        },
        required: ["name", "title", "rarity", "type", "description"]
      }
    }
  });

  try {
    const data = JSON.parse(response.text);
    return { ...data, id: Math.random().toString(36).substr(2, 9) };
  } catch (e) {
    throw new Error("Falha ao gerar loot");
  }
};

export const getSystemMessage = async (stats: PlayerStats, action: string): Promise<string> => {
  const prompt = `Atue como o "Sistema" de Solo Leveling. Dê uma mensagem curta, fria e intimidante em PORTUGUÊS BRASILEIRO para o jogador (Nível ${stats.level}, Classe: ${stats.job}) que acabou de fazer: ${action}. Use um tom de caixa azul brilhante e misteriosa.`;
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      maxOutputTokens: 100,
    }
  });

  return response.text || "SISTEMA: ERRO CRÍTICO.";
};
