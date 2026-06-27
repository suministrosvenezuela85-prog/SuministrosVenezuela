'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-sm w-full bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center space-y-5">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-gray-900">
            Algo salió mal
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            La aplicación encontró un error inesperado. Esto puede deberse a
            una conexión inestable o datos temporalmente no disponibles.
          </p>
        </div>

        {error.message && (
          <div className="bg-red-50 border border-red-100 rounded-lg p-3">
            <p className="text-xs text-red-700 font-mono break-all">
              {error.message}
            </p>
          </div>
        )}

        <button
          onClick={reset}
          className="w-full py-3 bg-gray-900 hover:bg-black text-white font-bold text-sm rounded-xl shadow flex items-center justify-center gap-2 active:scale-95 transition-all"
          aria-label="Reintentar carga de la aplicación"
        >
          <RefreshCw className="w-4 h-4" />
          Reintentar
        </button>

        <p className="text-[10px] text-gray-400">
          Suministros SOS v2.1.0 — Venezuela 🇻🇪
        </p>
      </div>
    </div>
  );
}
