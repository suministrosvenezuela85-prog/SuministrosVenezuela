'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * Hook que carga Leaflet dinámicamente una sola vez y devuelve la referencia.
 * Inyecta el CSS de Leaflet en el <head> una sola vez.
 */
export function useLeaflet() {
  const [L, setL] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  const loadingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || loadingRef.current || L) return;
    loadingRef.current = true;

    // Inyectar CSS una sola vez
    if (!document.getElementById('leaflet-css-global')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css-global';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    import('leaflet').then((leaflet) => {
      setL(leaflet);
      setIsReady(true);
    }).catch((err) => {
      console.error('Error al cargar Leaflet:', err);
      loadingRef.current = false;
    });
  }, [L]);

  return { L, isReady };
}
