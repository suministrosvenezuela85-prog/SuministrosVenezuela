'use client';

import React from 'react';
import { CentroAcopioConDetalles } from '../types/database.types';
import { getCategoriaLabel } from '../lib/categorias';

interface TabEstadisticasProps {
  centros: CentroAcopioConDetalles[];
}

export function TabEstadisticas({ centros }: TabEstadisticasProps) {
  const totalCentros = centros.length;
  const criticos = centros.filter(c => c.estatus_general === 'critico').length;
  const parciales = centros.filter(c => c.estatus_general === 'parcial').length;
  const surtidos = centros.filter(c => c.estatus_general === 'surtido').length;

  const todasNecesidades = centros.flatMap(c => c.necesidades || []);
  const totalNecesidades = todasNecesidades.length;
  const necesidadesPendientes = todasNecesidades.filter(n => n.estatus === 'pendiente').length;
  const necesidadesCriticas = todasNecesidades.filter(n => n.urgencia === 'critico').length;

  // Contar por categoría
  const conteoCategoria: Record<string, number> = {};
  todasNecesidades.forEach(n => {
    conteoCategoria[n.categoria] = (conteoCategoria[n.categoria] || 0) + 1;
  });
  const categoriasOrdenadas = Object.entries(conteoCategoria).sort((a, b) => b[1] - a[1]);
  const maxCategoria = categoriasOrdenadas.length > 0 ? categoriasOrdenadas[0][1] : 1;

  // Contar por estado
  const conteoEstado: Record<string, number> = {};
  centros.forEach(c => {
    conteoEstado[c.estado] = (conteoEstado[c.estado] || 0) + 1;
  });
  const estadosOrdenados = Object.entries(conteoEstado).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxEstado = estadosOrdenados.length > 0 ? estadosOrdenados[0][1] : 1;

  const pctCriticos = totalCentros > 0 ? Math.round((criticos / totalCentros) * 100) : 0;
  const pctParciales = totalCentros > 0 ? Math.round((parciales / totalCentros) * 100) : 0;
  const pctSurtidos = totalCentros > 0 ? Math.round((surtidos / totalCentros) * 100) : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-5" role="tabpanel" id="panel-estadisticas" aria-label="Estadísticas">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Estadísticas en Tiempo Real</h2>
        <p className="text-xs text-gray-500 mt-1">Visión macro para coordinadores de emergencia.</p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
          <p className="text-2xl font-bold text-gray-900">{totalCentros}</p>
          <p className="text-[10px] font-bold text-gray-500 uppercase">Centros</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
          <p className="text-2xl font-bold text-red-700">{necesidadesCriticas}</p>
          <p className="text-[10px] font-bold text-gray-500 uppercase">Críticas</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
          <p className="text-2xl font-bold text-amber-600">{necesidadesPendientes}</p>
          <p className="text-[10px] font-bold text-gray-500 uppercase">Pendientes</p>
        </div>
      </div>

      {/* Distribución de Urgencia */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Distribución de Urgencia</h3>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-red-700 w-16">Crítico</span>
            <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
              <div className="bg-red-600 h-full rounded-full transition-all duration-500" style={{ width: `${pctCriticos}%` }}></div>
            </div>
            <span className="text-[10px] font-bold text-gray-600 w-10 text-right">{pctCriticos}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-amber-700 w-16">Parcial</span>
            <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
              <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${pctParciales}%` }}></div>
            </div>
            <span className="text-[10px] font-bold text-gray-600 w-10 text-right">{pctParciales}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-emerald-700 w-16">Estable</span>
            <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${pctSurtidos}%` }}></div>
            </div>
            <span className="text-[10px] font-bold text-gray-600 w-10 text-right">{pctSurtidos}%</span>
          </div>
        </div>
      </div>

      {/* Categorías más demandadas */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Suministros Más Demandados</h3>
        {categoriasOrdenadas.length === 0 ? (
          <p className="text-xs text-gray-400">Sin datos aún.</p>
        ) : (
          <div className="space-y-1.5">
            {categoriasOrdenadas.map(([cat, count]) => (
              <div key={cat} className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-700 w-20 truncate">{getCategoriaLabel(cat)}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-3.5 overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${(count / maxCategoria) * 100}%` }}></div>
                </div>
                <span className="text-[10px] font-bold text-gray-600 w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top estados */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Centros por Estado (Top 8)</h3>
        {estadosOrdenados.length === 0 ? (
          <p className="text-xs text-gray-400">Sin datos aún.</p>
        ) : (
          <div className="space-y-1.5">
            {estadosOrdenados.map(([estado, count]) => (
              <div key={estado} className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-700 w-24 truncate">{estado}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-3.5 overflow-hidden">
                  <div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${(count / maxEstado) * 100}%` }}></div>
                </div>
                <span className="text-[10px] font-bold text-gray-600 w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
