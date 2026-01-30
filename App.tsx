
import React, { useState } from 'react';
import { SetupForm } from './components/SetupForm';
import { ChatInterface } from './components/ChatInterface';
import { ResultsView } from './components/ResultsView';
import { NegotiationContext, NegotiationResult, AppStage } from './types';
import { createNegotiationChat } from './services/geminiService';
import { Chat } from '@google/genai';

const App: React.FC = () => {
  const [stage, setStage] = useState<AppStage>(AppStage.SETUP);
  const [context, setContext] = useState<NegotiationContext | null>(null);
  const [chat, setChat] = useState<Chat | null>(null);
  const [result, setResult] = useState<NegotiationResult | null>(null);

  const handleStart = (config: NegotiationContext) => {
    setContext(config);
    const newChat = createNegotiationChat(config);
    setChat(newChat);
    setStage(AppStage.SIMULATION);
  };

  const handleFinish = (finalResult: NegotiationResult) => {
    setResult(finalResult);
    setStage(AppStage.RESULTS);
  };

  const handleBackToSetup = () => {
    // Al regresar al setup, conservamos el contexto para que el formulario esté pre-llenado
    setStage(AppStage.SETUP);
  };

  const handleReset = () => {
    setStage(AppStage.SETUP);
    setContext(null);
    setChat(null);
    setResult(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header con Branding Orasi Lab */}
      <header className="bg-white border-b border-slate-200 py-4 px-8 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col items-start">
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-400 to-slate-200 shadow-inner flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-30 bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,#333_4px,#333_8px)]"></div>
              </div>
              <div className="flex items-baseline">
                <span className="text-2xl font-light text-slate-700 tracking-tight">ORASI</span>
                <span className="text-2xl font-light text-[#00AEEF] tracking-tight">Lab</span>
              </div>
            </div>
            <span className="text-[12px] md:text-sm uppercase tracking-[0.25em] font-bold text-slate-400 pl-10 -mt-1">
              Negocia con otro
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8">
        {stage === AppStage.SETUP && (
          <div className="space-y-12 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="text-center space-y-3 mt-8">
              <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight uppercase">
                Entrena tus habilidades de negociación
              </h1>
              <p className="text-slate-500 text-lg max-w-2xl mx-auto font-light">
                Enfréntate a un negociador senior con autoridad y perfecciona tu técnica comercial.
              </p>
            </div>
            {/* Pasamos el contexto actual para que el formulario mantenga los datos si se regresa */}
            <SetupForm onStart={handleStart} initialData={context || undefined} />
          </div>
        )}

        {stage === AppStage.SIMULATION && chat && context && (
          <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500">
            <div className="flex justify-start mb-2">
              <button 
                onClick={handleBackToSetup}
                className="group flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors text-xs font-bold uppercase tracking-widest"
              >
                <svg className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Ajustar Protocolo
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
               <div className="lg:col-span-1 space-y-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Expediente</h3>
                    <div className="space-y-3 text-sm">
                      <div>
                        <div className="font-semibold text-slate-700">Contraparte:</div>
                        <div className="text-slate-600 font-medium">{context.counterpart}</div>
                      </div>
                      <div>
                        <div className="font-semibold text-slate-700">Tema:</div>
                        <div className="text-slate-600 italic">"{context.topic}"</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-900 p-4 rounded-xl shadow-lg">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Tu Estrategia</h3>
                    <div className="space-y-3 text-sm">
                      <div>
                        <div className="font-semibold text-white">Objetivo Ideal:</div>
                        <div className="text-slate-300">{context.idealGoal}</div>
                      </div>
                      <div>
                        <div className="font-semibold text-white">Línea Roja:</div>
                        <div className="text-red-400 font-bold">{context.redLine}</div>
                      </div>
                    </div>
                  </div>
               </div>
               <div className="lg:col-span-3">
                  <ChatInterface chat={chat} context={context} onFinish={handleFinish} />
               </div>
            </div>
          </div>
        )}

        {stage === AppStage.RESULTS && result && (
          <ResultsView result={result} onReset={handleReset} />
        )}
      </main>

      {/* Footer */}
      <footer className="py-8 px-6 text-center text-slate-400 text-[10px] uppercase tracking-widest border-t border-slate-200 bg-white mt-auto">
        &copy; {new Date().getFullYear()} Orasi Lab. Desarrollo de Habilidades de Negociación.
      </footer>
    </div>
  );
};

export default App;
