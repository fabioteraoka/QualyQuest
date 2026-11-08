import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
  variant?: 'header' | 'sidebar' | 'pill';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  showLabel = false,
  variant = 'header',
}) => {
  const { theme, isDark, toggleTheme } = useTheme();

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={`Alternar tema. Modo atual: ${isDark ? 'Escuro' : 'Claro'}`}
        title={isDark ? 'Mudar para Modo Claro (Light)' : 'Mudar para Modo Escuro (Dark)'}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer border ${
          isDark
            ? 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700 hover:text-amber-200'
            : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
        } ${className}`}
      >
        {isDark ? (
          <>
            <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Escuro</span>
          </>
        ) : (
          <>
            <Moon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>Claro</span>
          </>
        )}
      </button>
    );
  }

  if (variant === 'sidebar') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={`Alternar tema. Modo atual: ${isDark ? 'Escuro' : 'Claro'}`}
        title={isDark ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[7px] text-xs font-medium transition-all cursor-pointer ${
          isDark
            ? 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
        } ${className}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="shrink-0">
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-400" />
            )}
          </span>
          <span className="truncate">{isDark ? 'Modo Escuro Ativo' : 'Tema da Interface'}</span>
        </div>
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
            isDark
              ? 'bg-amber-950/60 text-amber-300 border border-amber-800/50'
              : 'bg-slate-800 text-slate-300 border border-slate-700'
          }`}
        >
          {isDark ? 'DARK' : 'LIGHT'}
        </span>
      </button>
    );
  }

  // Default 'header' button
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Alternar tema. Modo atual: ${isDark ? 'Escuro' : 'Claro'}`}
      title={isDark ? 'Alternar para Modo Claro (Light)' : 'Alternar para Modo Escuro (Dark)'}
      className={`relative p-2 rounded-[8px] transition-all duration-200 cursor-pointer border flex items-center gap-1.5 ${
        isDark
          ? 'bg-slate-800/90 border-slate-700 text-amber-300 hover:bg-slate-700 hover:border-slate-600 shadow-xs'
          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 shadow-xs'
      } ${className}`}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-180 duration-200" />
      ) : (
        <Moon className="w-4 h-4 text-slate-600 group-hover:text-slate-900" />
      )}
      {showLabel && (
        <span className="text-xs font-semibold hidden md:inline">
          {isDark ? 'Dark' : 'Light'}
        </span>
      )}
    </button>
  );
};
