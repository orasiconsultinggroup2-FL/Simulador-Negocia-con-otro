
import React from 'react';
import { NegotiationResult } from '../types';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';

interface ResultsViewProps {
  result: NegotiationResult;
  onReset: () => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({ result, onReset }) => {
  const barData = [
    { name: 'Intereses', score: result.puntuacion_intereses, color: '#3b82f6' },
    { name: 'Exploración', score: result.puntuacion_exploracion, color: '#f59e0b' },
    { name: 'Creatividad', score: result.puntuacion_creatividad, color: '#10b981' },
  ];

  const radarData = [
    { subject: 'Eficacia', A: result.puntuacion_intereses, fullMark: 100 },
    { subject: 'Exploración', A: result.puntuacion_exploracion, fullMark: 100 },
    { subject: 'Creatividad', A: result.puntuacion_creatividad, fullMark: 100 },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 text-center">
        <div className="inline-block p-4 rounded-full bg-blue-50 text-blue-600 mb-4">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 mb-2">Simulación Finalizada</h2>
        <p className="text-slate-500 max-w-lg mx-auto italic">“La creatividad en la mesa de negociación permite encontrar soluciones donde otros solo ven conflictos.”</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200 flex flex-col items-center justify-center">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Análisis Comparativo</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name="Puntuación"
                  dataKey="A"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.5}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex gap-4 text-xs">
            {barData.map(d => (
              <div key={d.name} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: d.color }}></div>
                <span className="text-slate-500 font-medium">{d.name}: {d.score}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 p-8 rounded-2xl shadow-lg text-white flex flex-col justify-between border border-slate-700">
          <div>
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 border-b border-slate-700 pb-3">
              <svg className="w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM13.464 15.657a1 1 0 010-1.414l.707-.707a1 1 0 011.414 1.414l-.707.707a1 1 0 01-1.414 0zM10 8a2 2 0 100 4 2 2 0 000-4z" />
              </svg>
              Feedback Técnico Senior
            </h3>
            <div className="text-slate-300 leading-relaxed mb-6 space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {result.analisis_feedback.split('\n').map((line, i) => (
                <p key={i} className={line.includes(':') ? 'font-medium text-blue-300' : ''}>
                  {line}
                </p>
              ))}
            </div>
          </div>
          <div className="pt-6 border-t border-slate-700">
             <div className="text-sm uppercase tracking-widest text-slate-500 mb-2 font-bold">Diagnóstico Final</div>
             <p className="text-blue-400 font-bold text-lg mb-6">{result.cta}</p>
             <button 
                onClick={onReset}
                className="w-full py-3 px-4 bg-white text-slate-900 rounded-lg font-bold hover:bg-slate-100 transition-colors uppercase tracking-widest text-xs"
             >
               Nueva Simulación de Alto Nivel
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
