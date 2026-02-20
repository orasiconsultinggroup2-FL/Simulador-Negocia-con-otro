import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, NegotiationResult, NegotiationContext } from '../types';
import { Chat, LiveServerMessage } from '@google/genai';
import { parseResult, connectLiveNegotiation, encodePCM, decodePCM, decodeAudioData } from '../services/geminiService';

interface ChatInterfaceProps {
  chat: Chat;
  context: NegotiationContext;
  onFinish: (result: NegotiationResult) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ chat, context, onFinish }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [liveStatus, setLiveStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [timeLeft, setTimeLeft] = useState(context.durationMinutes * 60);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasAutoFinished = useRef(false);
  
  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sessionRef = useRef<any>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const transcriptionRef = useRef({ user: '', model: '' });

  useEffect(() => {
    if (timeLeft <= 0 && !hasAutoFinished.current) {
      hasAutoFinished.current = true;
      handleSend(undefined, "Finalizar");
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSend = async (e?: React.FormEvent, customText?: string) => {
    e?.preventDefault();
    const textToSend = customText || input.trim();
    if (!textToSend || loading) return;

    if (!customText) setInput('');
    setMessages(prev => [...prev, { role: 'user', text: textToSend }]);
    setLoading(true);

    try {
      const result = await chat.sendMessage({ message: textToSend });
      const modelText = result.text || '';
      const parsed = parseResult(modelText);
      if (parsed) {
        stopVoice();
        onFinish(parsed);
        return;
      }
      setMessages(prev => [...prev, { role: 'model', text: modelText }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "Error de conexión." }]);
    } finally {
      setLoading(false);
    }
  };

  const stopVoice = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (audioContextInRef.current) audioContextInRef.current.close();
    if (audioContextOutRef.current) audioContextOutRef.current.close();
    sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    sourcesRef.current.clear();
    setIsVoiceMode(false);
    setLiveStatus('disconnected');
  };

  const startVoice = async () => {
    try {
      console.log("Iniciando modo voz...");
      setLiveStatus('connecting');
      setIsVoiceMode(true);
      
      const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext);
      audioContextInRef.current = new AudioCtx({ sampleRate: 16000 });
      audioContextOutRef.current = new AudioCtx({ sampleRate: 24000 });
      
      await audioContextInRef.current.resume();
      await audioContextOutRef.current.resume();
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = connectLiveNegotiation(context, {
        onopen: () => {
          console.log("CONEXIÓN LIVE API ABIERTA EXITOSAMENTE");
          setLiveStatus('connected');
          if (!audioContextInRef.current) return;
          const source = audioContextInRef.current.createMediaStreamSource(stream);
          const processor = audioContextInRef.current.createScriptProcessor(4096, 1, 1);
          processor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const int16 = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              int16[i] = Math.max(-1, Math.min(1, inputData[i])) * 32767;
            }
            const pcmBlob = {
              data: encodePCM(new Uint8Array(int16.buffer)),
              mimeType: 'audio/pcm;rate=16000',
            };
            sessionPromise.then(s => { if (s) s.sendRealtimeInput({ media: pcmBlob }); });
          };
          source.connect(processor);
          processor.connect(audioContextInRef.current.destination);
        },
        onmessage: async (msg: LiveServerMessage) => {
          console.log("Mensaje de Live API:", msg);
          if (msg.serverContent?.inputTranscription?.text) {
            transcriptionRef.current.user += msg.serverContent.inputTranscription.text;
          }
          if (msg.serverContent?.modelTurn) {
            for (const part of msg.serverContent.modelTurn.parts) {
              if (part.inlineData?.data && audioContextOutRef.current) {
                const audioBase64 = part.inlineData.data;
                const ctx = audioContextOutRef.current;
                if (ctx.state === 'suspended') await ctx.resume();
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                const buffer = await decodeAudioData(decodePCM(audioBase64), ctx, 24000, 1);
                const source = ctx.createBufferSource();
                source.buffer = buffer;
                source.connect(ctx.destination);
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += buffer.duration;
                sourcesRef.current.add(source);
                source.onended = () => sourcesRef.current.delete(source);
              }
              if (part.text) {
                transcriptionRef.current.model += part.text;
                if (part.text.includes('puntuacion_intereses')) {
                  const parsed = parseResult(part.text);
                  if (parsed) { stopVoice(); onFinish(parsed); }
                }
              }
            }
          }
          if (msg.serverContent?.interrupted) {
            sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
            sourcesRef.current.clear();
            nextStartTimeRef.current = 0;
          }
          if (msg.serverContent?.turnComplete) {
            const uText = transcriptionRef.current.user;
            const mText = transcriptionRef.current.model;
            if (uText || mText) {
              setMessages(prev => [
                ...prev,
                ...(uText ? [{ role: 'user' as const, text: uText }] : []),
                ...(mText ? [{ role: 'model' as const, text: mText }] : [])
              ]);
            }
            transcriptionRef.current = { user: '', model: '' };
          }
        },
        onerror: (e: any) => { stopVoice(); },
        onclose: () => { setLiveStatus('disconnected'); setIsVoiceMode(false); }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) { stopVoice(); }
  };

  return (
    <div className="flex flex-col h-[70vh] bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden relative">
      <div className="bg-slate-900 px-6 py-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isVoiceMode ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className="text-white font-semibold tracking-wide uppercase text-xs">
              {isVoiceMode ? `Modo Voz: ${liveStatus}` : 'Modo Escrito'}
            </span>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold ${
            timeLeft < 60 ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-700 text-slate-300'
          }`}>
            {formatTime(timeLeft)}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={isVoiceMode ? stopVoice : startVoice} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isVoiceMode ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>
            {isVoiceMode ? 'Detener Voz' : 'Activar Voz'}
          </button>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50">
        {messages.map((m, i) => {
          let displayText = m.text;
          try {
            if (m.role === 'model' && m.text.trim().startsWith('{')) {
              const parsed = JSON.parse(m.text);
              displayText = parsed.message || parsed.analisis_feedback || m.text;
            }
          } catch (e) {}
          return (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl shadow-sm ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white text-slate-800 border border-slate-200'}`}>
                <p className="whitespace-pre-wrap leading-relaxed">{displayText}</p>
              </div>
            </div>
          );
        })}
      </div>
      {!isVoiceMode && (
        <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-200 flex gap-2">
          <input type="text" placeholder="Escribe tu mensaje..." className="flex-1 px-4 py-3 rounded-lg border outline-none" value={input} onChange={e => setInput(e.target.value)} />
          <button type="submit" disabled={loading} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold">Enviar</button>
        </form>
      )}
    </div>
  );
};
