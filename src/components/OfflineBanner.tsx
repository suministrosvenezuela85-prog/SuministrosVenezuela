'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface OfflineBannerProps {
  count: number;
  isOnline: boolean;
  sincronizando: boolean;
  syncAlert: string;
  onSync: () => void;
}

export function OfflineBanner({ count, isOnline, sincronizando, syncAlert, onSync }: OfflineBannerProps) {
  return (
    <>
      {/* Barra de sincronización */}
      {syncAlert && (
        <div
          className="bg-emerald-600 text-white text-[11px] font-bold text-center py-2 px-4 sticky top-0 z-50 flex items-center justify-center gap-1.5 shadow-md"
          role="alert"
          aria-live="assertive"
        >
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>{syncAlert}</span>
        </div>
      )}

      {/* Banner de reportes pendientes */}
      {count > 0 && (
        <div className="bg-amber-50 text-amber-900 border border-amber-200 rounded-xl p-3.5 mb-4 space-y-2 text-xs" role="alert" aria-live="polite">
          <div className="flex items-start gap-1.5 font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 animate-pulse" aria-hidden="true" />
            <span>Tienes {count} reporte(s) guardado(s) offline</span>
          </div>
          <p className="leading-normal">
            Estos reportes están seguros en este dispositivo y se subirán automáticamente al recuperar conexión.
          </p>
          {isOnline && (
            <button
              type="button"
              onClick={onSync}
              disabled={sincronizando}
              className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg flex items-center justify-center gap-1 active:scale-95 transition-transform disabled:opacity-50"
              aria-label="Forzar sincronización de reportes offline"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${sincronizando ? 'animate-spin' : ''}`} />
              FORZAR SINCRONIZACIÓN
            </button>
          )}
        </div>
      )}
    </>
  );
}
