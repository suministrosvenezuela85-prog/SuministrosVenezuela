'use client';

import React from 'react';
import { Radio, Search, Wifi, WifiOff } from 'lucide-react';

interface HeaderProps {
  isOnline: boolean;
  searchOpen: boolean;
  searchQuery: string;
  onToggleSearch: () => void;
  onSearchChange: (query: string) => void;
}

export function Header({ isOnline, searchOpen, searchQuery, onToggleSearch, onSearchChange }: HeaderProps) {
  return (
    <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-100/50 z-30 shadow-sm px-4 py-3" role="banner">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center" aria-hidden="true">
            <span className={`animate-ping absolute inline-flex h-3 w-3 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-red-400'} opacity-75`}></span>
            <Radio className={`w-5 h-5 ${isOnline ? 'text-emerald-600' : 'text-red-500'} relative z-10 shrink-0`} />
          </div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-1.5">
            Suministros SOS <span className="text-base">🇻🇪</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
              isOnline
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                : 'bg-red-50 text-red-700 border border-red-100'
            } shrink-0`}
            role="status"
            aria-live="polite"
            aria-label={isOnline ? 'Conectado a internet' : 'Sin conexión a internet'}
          >
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 mr-1" />
                Conectado
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 mr-1 animate-pulse" />
                Sin Señal
              </>
            )}
          </span>

          <button
            onClick={onToggleSearch}
            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg active:scale-95 transition-transform"
            aria-label="Buscar suministros"
            aria-expanded={searchOpen}
          >
            <Search className="w-5 h-5" />
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="mt-2 animate-fadeIn">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" aria-hidden="true" />
            <input
              type="text"
              placeholder="Ej. Refugio, comida, agua, Carabobo..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 font-medium text-gray-800"
              autoFocus
              aria-label="Buscar centros de acopio, suministros o ubicaciones"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-2 text-xs font-bold text-gray-400 hover:text-gray-600"
                aria-label="Limpiar búsqueda"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
