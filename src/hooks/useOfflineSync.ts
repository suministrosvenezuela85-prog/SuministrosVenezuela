'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { EstatusCentro, CategoriaNecesidad } from '../types/database.types';

interface ReporteEncolado {
  id: string;
  timestamp: number;
  nombreCentro: string;
  estado: string;
  municipio: string;
  direccion: string;
  latitud: number | null;
  longitud: number | null;
  categoria: CategoriaNecesidad;
  descripcion: string;
  cantidad: string;
  urgencia: 'critico' | 'parcial' | 'recibiendo';
  verificado: boolean;
}

const STORAGE_KEY = 'suministros_sos_cola_offline';
const MAX_QUEUE_SIZE = 20;
const MAX_AGE_MS = 48 * 60 * 60 * 1000; // 48 horas

/**
 * Hook que gestiona la cola de reportes offline, la detección de red,
 * la sincronización automática/manual y los límites de seguridad.
 */
export function useOfflineSync(refetch: () => void) {
  const [isOnline, setIsOnline] = useState(true);
  const [colaOffline, setColaOffline] = useState<ReporteEncolado[]>([]);
  const [sincronizando, setSincronizando] = useState(false);
  const [syncAlert, setSyncAlert] = useState('');

  // Cargar cola inicial y detectar red
  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    // Cargar y limpiar cola (eliminar expirados)
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as ReporteEncolado[];
    const now = Date.now();
    const filtered = raw.filter((r) => now - r.timestamp < MAX_AGE_MS);
    if (filtered.length !== raw.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }
    setColaOffline(filtered);

    const handleOnline = () => {
      setIsOnline(true);
      setSyncAlert('📶 Conexión restablecida. Sincronizando reportes locales...');
      setTimeout(() => procesarCola(), 1000);
    };

    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sincronizador periódico (cada 30 segundos)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const interval = setInterval(() => {
      if (navigator.onLine && !sincronizando) {
        procesarCola();
      }
    }, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sincronizando]);

  const procesarCola = useCallback(async () => {
    const queue = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as ReporteEncolado[];
    if (queue.length === 0 || sincronizando) return;

    setSincronizando(true);
    setSyncAlert('🔄 Procesando sincronización de reportes locales...');

    let errores = false;
    const colaRestante = [...queue];

    for (const reporte of queue) {
      try {
        const estatusCentro: EstatusCentro =
          reporte.urgencia === 'critico' ? 'critico' :
          reporte.urgencia === 'parcial' ? 'parcial' : 'surtido';

        const coordenadas = reporte.latitud && reporte.longitud
          ? `(${reporte.longitud},${reporte.latitud})`
          : null;

        const { data: centroData, error: centroError } = await supabase
          .from('centros_acopio')
          .insert({
            nombre: reporte.nombreCentro,
            estado: reporte.estado,
            municipio: reporte.municipio,
            direccion: reporte.direccion,
            coordenadas,
            estatus_general: estatusCentro,
            verificado: reporte.verificado,
            creado_por: null,
          })
          .select()
          .single();

        if (centroError) throw centroError;

        const { error: necesidadError } = await supabase
          .from('necesidades')
          .insert({
            centro_id: centroData.id,
            categoria: reporte.categoria,
            descripcion: reporte.descripcion,
            cantidad_requerida: reporte.cantidad,
            estatus: 'pendiente',
            urgencia: reporte.urgencia,
            votos_no_vigente: 0,
            votos_vigente: 0,
          });

        if (necesidadError) throw necesidadError;

        colaRestante.shift();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(colaRestante));
        setColaOffline([...colaRestante]);
      } catch (err) {
        console.error('Error al sincronizar reporte:', err);
        errores = true;
        break;
      }
    }

    setSincronizando(false);
    if (!errores) {
      setSyncAlert('✅ ¡Sincronización completada!');
      setTimeout(() => setSyncAlert(''), 4000);
      refetch();
    } else {
      setSyncAlert('⚠️ Sincronización parcial. Se reintentará automáticamente.');
      setTimeout(() => setSyncAlert(''), 4000);
    }
  }, [sincronizando, refetch]);

  const encolarReporte = useCallback((reporte: Omit<ReporteEncolado, 'id' | 'timestamp'>): boolean => {
    const cola = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as ReporteEncolado[];

    if (cola.length >= MAX_QUEUE_SIZE) {
      return false; // Cola llena
    }

    const nuevo: ReporteEncolado = {
      ...reporte,
      id: Math.random().toString(36).substring(2),
      timestamp: Date.now(),
    };

    const nuevaCola = [...cola, nuevo];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevaCola));
    setColaOffline(nuevaCola);
    return true;
  }, []);

  return {
    isOnline,
    colaOffline,
    sincronizando,
    syncAlert,
    procesarCola,
    encolarReporte,
  };
}
