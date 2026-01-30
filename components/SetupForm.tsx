import React, { useState, useEffect } from 'react';
import { NegotiationContext } from '../types';

interface SetupFormProps {
  onStart: (context: NegotiationContext) => void;
  initialData?: NegotiationContext;
}

export const SetupForm: React.FC<SetupFormProps> = ({ onStart, initialData }) => {
  const [formData, setFormData] = useState<NegotiationContext>(initialData || {
    counterpart: '',
    topic: '',
    idealGoal: '',
    redLine: '',
    durationMinutes: 5,
    style: 'competitivo',
    counterpartGender: 'masculino'
  });

  // Asegurar que si initialData cambia (por retroceso), el estado se actualice
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStart(formData);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* SECCIÓN DEL OPONENTE */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-slate-900"></div>
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-slate-900 p-2 rounded-lg text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">I. Perfil del Oponente</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Entidad y Cargo del Oponente</label>
                <input
                  required
                  type="text"
                  placeholder="Ej: CEO de TechCorp / Director de Compras"
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-all bg-slate-50 text-slate-800 placeholder:text-slate-300"
                  value={formData.counterpart}
                  onChange={e => setFormData(prev => ({ ...prev, counterpart: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Género de la Contraparte</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, counterpartGender: 'masculino' }))}
                    className={`py-3 px-4 rounded-lg font-bold text-xs uppercase tracking-widest transition-all border ${
                      formData.counterpartGender === 'masculino' 
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                      : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    Masculino
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, counterpartGender: 'femenino' }))}
                    className={`py-3 px-4 rounded-lg font-bold text-xs uppercase tracking-widest transition-all border ${
                      formData.counterpartGender === 'femenino' 
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                      : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    Femenino
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Conflicto en Materia</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describa el desacuerdo o la situación a resolver..."
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-all bg-slate-50 text-slate-800 placeholder:text-slate-300 resize-none"
                  value={formData.topic}
                  onChange={e => setFormData(prev => ({ ...prev, topic: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN DEL USUARIO */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#00AEEF]"></div>
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-[#00AEEF] p-2 rounded-lg text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">II. Tu Estrategia</h2>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tu Objetivo Ideal (ZOPA Alta)</label>
                  <input
                    required
                    type="text"
                    placeholder="Lo que aspiras lograr..."
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-[#00AEEF] focus:ring-1 focus:ring-[#00AEEF] outline-none transition-all bg-slate-50 text-slate-800 placeholder:text-slate-300"
                    value={formData.idealGoal}
                    onChange={e => setFormData(prev => ({ ...prev, idealGoal: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tu Línea Roja (Límite BATNA)</label>
                  <input
                    required
                    type="text"
                    placeholder="El punto en el que te retiras..."
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-red-400 focus:ring-1 focus:ring-red-400 outline-none transition-all bg-slate-50 text-slate-800 placeholder:text-slate-300"
                    value={formData.redLine}
                    onChange={e => setFormData(prev => ({ ...prev, redLine: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Dureza del Oponente</label>
                  <select
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-1 focus:ring-slate-900 outline-none transition-all bg-slate-900 text-white font-bold text-sm"
                    value={formData.style}
                    onChange={e => setFormData(prev => ({ ...prev, style: e.target.value as any }))}
                  >
                    <option value="competitivo">COMPETITIVO</option>
                    <option value="colaborativo">COLABORATIVO</option>
                    <option value="evitativo">EVITATIVO</option>
                    <option value="acomodativo">ACOMODATIVO</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ventana de Tiempo</label>
                  <select
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-1 focus:ring-slate-900 outline-none transition-all bg-slate-900 text-white font-bold text-sm"
                    value={formData.durationMinutes}
                    onChange={e => setFormData(prev => ({ ...prev, durationMinutes: parseInt(e.target.value) }))}
                  >
                    <option value={2}>2 MINUTOS</option>
                    <option value={5}>5 MINUTOS</option>
                    <option value={10}>10 MINUTOS</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-4">
          <button
            type="submit"
            className="group relative w-full max-w-md bg-slate-900 text-white font-black py-5 rounded-2xl hover:bg-slate-800 transition-all shadow-2xl uppercase tracking-[0.3em] text-sm overflow-hidden"
          >
            <span className="relative z-10">INICIAR NEGOCIACION</span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          </button>
        </div>
      </form>
    </div>
  );
};
