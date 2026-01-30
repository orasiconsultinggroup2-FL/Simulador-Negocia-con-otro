
import { GoogleGenAI, Chat, Modality, Type } from "@google/genai";
import { NegotiationContext, NegotiationResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const getVoiceForContext = (context: NegotiationContext): string => {
  const key = `${context.style}-${context.counterpartGender}`;
  const voiceMap: Record<string, string> = {
    'competitivo-masculino': 'Fenrir',
    'competitivo-femenino': 'Kore',
    'colaborativo-masculino': 'Puck',
    'colaborativo-femenino': 'Zephyr',
    'evitativo-masculino': 'Charon',
    'evitativo-femenino': 'Kore', 
    'acomodativo-masculino': 'Puck', 
    'acomodativo-femenino': 'Zephyr'
  };
  // Nota: Dado que hay 5 voces predefinidas, se asignan para maximizar la distinción tonal según el estilo.
  return voiceMap[key] || 'Charon';
};

const getSystemInstruction = (context: NegotiationContext) => `
  Rol: Eres un NEGOCIADOR SENIOR (${context.counterpartGender.toUpperCase()}) de ORASI Lab. 
  Tu función es ser una contraparte directa, seria y con autoridad. No eres un asistente amable. No uses emojis ni lenguaje servil.

  Identidad y Tono:
  - Usa frases de autoridad correspondientes a tu género ${context.counterpartGender}.
  - Ejemplos masculinos: "Soy el encargado", "He sido claro", "Estoy preparado".
  - Ejemplos femeninos: "Soy la encargada", "He sido clara", "Estoy preparada".
  - Estilo de Negociación: ${context.style.toUpperCase()}. Ajusta tu dureza según este perfil.

  Contexto de la Simulación:
  - Contraparte (Tú): ${context.counterpart}
  - Tema: ${context.topic}
  - Objetivo Ideal del Usuario: ${context.idealGoal}
  - Línea Roja del Usuario: ${context.redLine}

  REGLAS CRÍTICAS DURANTE LA NEGOCIACIÓN:
  1. Filtro de Seguridad: Si el usuario escribe incoherencias (ej: "xxxx", "asdf"), responde con frialdad y termina la sesión.
  2. Realismo: Defiende tus intereses con firmeza. No cedas sin obtener algo de igual o mayor valor.
  3. Proceso: No aceptes la primera oferta. Cuestiona la legitimidad de sus argumentos.

  INSTRUCCIONES PARA EL ANÁLISIS FINAL (AL FINALIZAR):
  Cuando el usuario diga "Finalizar" o se agote el tiempo, debes realizar una EVALUACIÓN TÉCNICA REAL basada en CINCO EJES:
  1. EXPLORACIÓN DE INTERESES.
  2. CREATIVIDAD PARA GENERAR VALOR.
  3. CONSISTENCIA (LÍNEA ROJA: ${context.redLine}).
  4. EFICACIA (OBJETIVO IDEAL: ${context.idealGoal}).
  5. TÁCTICA Y AUTORIDAD.

  Formato de salida (JSON ESTRICTO):
  {
    "puntuacion_intereses": (1-100),
    "puntuacion_creatividad": (1-100),
    "puntuacion_exploracion": (1-100),
    "analisis_feedback": "Estructura: EXPLORACIÓN Y DIAGNÓSTICO, GENERACIÓN DE VALOR, ESTRATEGIA DE RESULTADOS, FALLA CRÍTICA, VERDICTO SENIOR.",
    "cta": "Entrena con Orasi Consulting Group"
  }
`;

export const createNegotiationChat = (context: NegotiationContext): Chat => {
  return ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: getSystemInstruction(context),
      temperature: 0.6,
      responseMimeType: "application/json"
    },
  });
};

export const connectLiveNegotiation = (context: NegotiationContext, callbacks: any) => {
  const voiceName = getVoiceForContext(context);
  return ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-12-2025',
    callbacks,
    config: {
      systemInstruction: getSystemInstruction(context),
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { 
          prebuiltVoiceConfig: { 
            voiceName: voiceName
          } 
        },
      },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
    },
  });
};

export const parseResult = (text: string): NegotiationResult | null => {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : text;
    const obj = JSON.parse(jsonStr);
    if (obj.puntuacion_intereses !== undefined && obj.analisis_feedback) {
      return {
        ...obj,
        puntuacion_exploracion: obj.puntuacion_exploracion || 0
      };
    }
    return null;
  } catch (e) {
    return null;
  }
};

export function encodePCM(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function decodePCM(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
