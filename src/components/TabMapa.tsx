'use client';

import React, { useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useLeaflet } from '../hooks/useLeaflet';
import { CentroAcopioConDetalles } from '../types/database.types';
import { obtenerLatLng } from '../lib/geo';
import { getCategoriaLabel, getEstatusMapColor } from '../lib/categorias';

interface TabMapaProps {
  centros: CentroAcopioConDetalles[];
}

export function TabMapa({ centros }: TabMapaProps) {
  const { L, isReady } = useLeaflet();
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Inicializar el mapa una sola vez cuando Leaflet está listo
  useEffect(() => {
    if (!isReady || !L || !containerRef.current) return;

    // Solo crear el mapa si no existe
    if (!mapRef.current) {
      const map = L.map(containerRef.current).setView([8.5, -66.5], 6);
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);

      markersRef.current = L.layerGroup().addTo(map);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current = null;
      }
    };
  }, [isReady, L]);

  // Actualizar solo los marcadores cuando cambian los centros (sin destruir el mapa)
  useEffect(() => {
    if (!L || !markersRef.current) return;

    markersRef.current.clearLayers();

    centros.forEach((centro) => {
      const posicion = obtenerLatLng(centro.coordenadas);
      if (!posicion) return;

      const color = getEstatusMapColor(centro.estatus_general);

      const pinIcon = L.divIcon({
        html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.35);"></div>`,
        className: 'custom-map-pin',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const necesidadesLista = centro.necesidades?.length > 0
        ? centro.necesidades.map(n => `<li>${getCategoriaLabel(n.categoria)} (${n.urgencia.toUpperCase()})</li>`).join('')
        : '<li>Sin suministros urgentes</li>';

      const popupContent = `
        <div style="font-family: system-ui, sans-serif; font-size: 12px; min-width: 160px; padding: 2px;">
          <h4 style="margin: 0 0 3px 0; font-weight: bold; font-size: 13px; color: #111827;">${centro.nombre}</h4>
          <p style="margin: 0 0 6px 0; color: #4b5563; font-size: 10px;">${centro.municipio}, ${centro.estado}</p>
          <div style="margin-bottom: 6px;">
            <span style="display: inline-block; padding: 1.5px 5px; border-radius: 4px; font-weight: bold; font-size: 9px; color: white; background-color: ${color};">
              ${centro.estatus_general.toUpperCase()}
            </span>
          </div>
          <ul style="margin: 0; padding-left: 14px; font-size: 10.5px; color: #374151; line-height: 1.35;">
            ${necesidadesLista}
          </ul>
        </div>
      `;

      L.marker(posicion, { icon: pinIcon })
        .addTo(markersRef.current)
        .bindPopup(popupContent);
    });
  }, [L, centros]);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-4" role="tabpanel" id="panel-mapa" aria-label="Mapa de suministros">
      <div>
        <h2 className="text-xl font-bold text-gray-900 leading-tight">Mapa de Suministros SOS</h2>
        <p className="text-xs text-gray-500 mt-1">Visualización geográfica interactiva en tiempo real.</p>
      </div>

      <div className="relative rounded-xl overflow-hidden border border-gray-200 shadow-inner">
        <div ref={containerRef} style={{ height: '320px', width: '100%' }} className="rounded-xl" />
        {!isReady && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-[1000]" role="status">
            <Loader2 className="w-6 h-6 text-red-600 animate-spin mr-2" aria-hidden="true" />
            <p className="text-xs text-gray-500 font-bold">Cargando mapa...</p>
          </div>
        )}
      </div>

      <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Leyenda</h4>
        <div className="flex items-center justify-between text-xs font-bold text-gray-700 px-1">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-[#dc2626] inline-block border-2 border-white shadow-sm" aria-hidden="true" />
            <span>Crítico</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-[#f59e0b] inline-block border-2 border-white shadow-sm" aria-hidden="true" />
            <span>Parcial</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-[#10b981] inline-block border-2 border-white shadow-sm" aria-hidden="true" />
            <span>Estable</span>
          </div>
        </div>
      </div>
    </div>
  );
}
