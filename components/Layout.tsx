
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  onSave?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, onSave }) => {
  return (
    <div className="min-h-screen relative flex flex-col items-center p-4 md:p-8 overflow-hidden">
      <div className="scanline-effect"></div>
      
      {/* HUD Header */}
      <header className="w-full max-w-6xl mb-8 flex justify-between items-center z-10 border-b border-sky-500/10 pb-4">
        <div className="flex flex-col">
          <h1 className="system-font text-3xl font-black text-sky-400 glow-blue tracking-tighter">
            SISTEMA <span className="text-white">v1.1</span>
          </h1>
          <p className="text-[10px] text-sky-300 opacity-50 uppercase tracking-[0.2em]">
            Status Neural: Ativo | Sincronização: 100%
          </p>
        </div>
        
        <div className="flex gap-4">
          {onSave && (
            <button 
              onClick={onSave}
              className="system-border system-bg px-4 py-1 rounded border-sky-500/50 hover:bg-sky-500/20 transition-all group flex flex-col items-center justify-center min-w-[100px]"
            >
              <span className="text-[9px] text-sky-400 block uppercase font-black tracking-tighter group-hover:text-white">Sincronizar</span>
              <div className="flex items-center gap-2">
                  <svg className="w-3 h-3 text-sky-400 group-hover:animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="system-font text-[11px] text-white">SALVAR</span>
              </div>
            </button>
          )}
          
          <div className="system-border system-bg px-4 py-1 rounded hidden sm:block">
            <span className="text-[10px] text-sky-400 block uppercase font-bold tracking-tighter">Tempo Decorrido</span>
            <span className="system-font text-sm font-mono">{new Date().toLocaleTimeString()}</span>
          </div>
          <div className="system-border system-bg px-4 py-1 rounded border-yellow-500/30">
            <span className="text-[10px] text-yellow-500 block uppercase font-bold tracking-tighter">Tesouro Real</span>
            <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></div>
                <span className="system-font text-sm text-yellow-400">GOLD</span>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full max-w-6xl z-10 flex-1 flex flex-col">
        {children}
      </main>

      {/* Decorative corners */}
      <div className="fixed top-0 left-0 w-32 h-32 border-t-2 border-l-2 border-sky-500/10 pointer-events-none"></div>
      <div className="fixed bottom-0 right-0 w-32 h-32 border-b-2 border-r-2 border-sky-500/10 pointer-events-none"></div>
    </div>
  );
};
