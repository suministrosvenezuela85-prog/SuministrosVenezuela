'use client';

import { useState, useCallback } from 'react';

/**
 * Hook reutilizable de geolocalización GPS.
 */
export function useGeolocation() {
  const [latitud, setLatitud] = useState<number | null>(null);
  const [longitud, setLongitud] = useState<number | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsReady, setGpsReady] = useState(false);
  const [gpsError, setGpsError] = useState('');

  const detectarUbicacion = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsError('La geolocalización no es compatible con este navegador.');
      return;
    }

    setGpsLoading(true);
    setGpsError('');
    setGpsReady(false);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitud(position.coords.latitude);
        setLongitud(position.coords.longitude);
        setGpsLoading(false);
        setGpsReady(true);
      },
      (geoErr) => {
        const mensajes: Record<number, string> = {
          1: 'Permiso de ubicación denegado. Active el GPS en ajustes del navegador.',
          2: 'Ubicación no disponible. Verifique que el GPS esté activado.',
          3: 'Tiempo de espera agotado. Intente en un lugar con mejor señal.',
        };
        const msg = mensajes[geoErr.code] || `Error GPS: ${geoErr.message}`;
        console.warn('GPS:', geoErr.code, geoErr.message);
        setGpsError(msg);
        setGpsLoading(false);
        // Fallback a Caracas
        setLatitud(10.4806);
        setLongitud(-66.9036);
        setGpsReady(true);
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  }, []);

  const resetGps = useCallback(() => {
    setLatitud(null);
    setLongitud(null);
    setGpsReady(false);
    setGpsError('');
  }, []);

  return { latitud, longitud, gpsLoading, gpsReady, gpsError, detectarUbicacion, resetGps };
}
