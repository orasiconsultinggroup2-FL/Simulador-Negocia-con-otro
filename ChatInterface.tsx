
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
  
  // Voice Mode Refs
  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sessionRef = useRef<any>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const transcriptionRef = useRef({ user: '', model: '' });

  // Timer Effect
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
      setMessages(prev => [...prev, { role: 'model', text: "Error de conexión. Por favor intenta de nuevo." }]);
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
    sourcesRef.current.forEach(s => s.stop());
    sourcesRef.current.clear();
    setIsVoiceMode(false);
    setLiveStatus('disconnected');
  };

  const startVoice = async () => {
    try {
      setLiveStatus('connecting');
      setIsVoiceMode(true);
      
      audioContextInRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextOutRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = connectLiveNegotiation(context, {
        onopen: () => {
          setLiveStatus('connected');
          const source = audioContextInRef.current!.createMediaStreamSource(stream);
          const processor = audioContextInRef.current!.createScriptProcessor(4096, 1, 1);
          
          processor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const int16 = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              int16[i] = inputData[i] * 32768;
            }
            const pcmBlob = {
              data: encodePCM(new Uint8Array(int16.buffer)),
              mimeType: 'audio/pcm;rate=16000',
            };
            sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
          };
          
          source.connect(processor);
          processor.connect(audioContextInRef.current!.destination);
        },
        onmessage: async (msg: LiveServerMessage) => {
          if (msg.serverContent?.inputTranscription) {
            transcriptionRef.current.user += msg.serverContent.inputTranscription.text;
          }
          if (msg.serverContent?.outputTranscription) {
            transcriptionRef.current.model += msg.serverContent.outputTranscription.text;
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
            
            if (uText.toLowerCase().includes('finalizar')) {
              stopVoice();
              handleSend(undefined, "Finalizar");
            }
            
            transcriptionRef.current = { user: '', model: '' };
          }

          const audioBase64 = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (audioBase64 && audioContextOutRef.current) {
            const ctx = audioContextOutRef.current;
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

          if (msg.serverContent?.interrupted) {
            sourcesRef.current.forEach(s => s.stop());
            sourcesRef.current.clear();
            nextStartTimeRef.current = 0;
          }

          const potentialJson = msg.serverContent?.modelTurn?.parts[0]?.text;
          if (potentialJson && potentialJson.includes('puntuacion_intereses')) {
            const parsed = parseResult(potentialJson);
            if (parsed) {
              stopVoice();
              onFinish(parsed);
            }
          }
        },
        onerror: (e: any) => {
          console.error("Live Error:", e);
          stopVoice();
        },
        onclose: () => {
          setLiveStatus('disconnected');
          setIsVoiceMode(false);
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Voice setup failed:", err);
      stopVoice();
    }
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
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {formatTime(timeLeft)}
          </div>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={isVoiceMode ? stopVoice : startVoice}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              isVoiceMode 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isVoiceMode ? (
              <><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" /></svg> Detener Voz</>
            ) : (
              <><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4z" /><path d="M4 8a1 1 0 011-1h1a1 1 0 010 2H5a1 1 0 01-1-1zM16 8a1 1 0 11-2 0 1 1 0 012 0zM10 13a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1z" /></svg> Activar Voz</>
            )}
          </button>
          <button 
            onClick={() => { setInput('Finalizar'); handleSend(); }}
            className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            Finalizar
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-slate-200 overflow-hidden">
        <div 
          className={`h-full transition-all duration-1000 ease-linear ${timeLeft < 60 ? 'bg-red-500' : 'bg-blue-500'}`}
          style={{ width: `${(timeLeft / (context.durationMinutes * 60)) * 100}%` }}
        ></div>
      </div>

      <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50">
        {messages.length === 0 && !isVoiceMode && (
          <div className="text-center py-20 text-slate-400">
            <p className="text-lg italic">Envía tu primera propuesta o activa el Modo Voz...</p>
            <p className="text-sm mt-2">Tienes {context.durationMinutes} minutos para cerrar el trato.</p>
          </div>
        )}
        
        {isVoiceMode && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
             <div className="flex gap-1">
                <div className="w-2 h-8 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-12 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-8 bg-blue-500 rounded-full animate-bounce"></div>
             </div>
             <p className="font-medium">Escuchando... Háblale a la contraparte</p>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-4 py-3 rounded-2xl shadow-sm ${
              m.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
            }`}>
              <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
            </div>
          </div>
        ))}
        {loading && !isVoiceMode && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-tl-none animate-pulse flex gap-2">
               <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
               <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
               <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
            </div>
          </div>
        )}
      </div>

      {!isVoiceMode && (
        <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-200 flex gap-2 shrink-0">
          <input
            type="text"
            placeholder="Escribe tu mensaje..."
            className="flex-1 px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
            value={input}
            onChange={e => setInput(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {loading ? 'Pensando...' : 'Enviar'}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      )}
      
      {isVoiceMode && (
        <div className="p-4 bg-blue-50 border-t border-blue-100 text-center text-blue-800 text-sm font-medium">
          La contraparte te escucha. Tiempo restante: {formatTime(timeLeft)}
        </div>
      )}
    </div>
  );
};
