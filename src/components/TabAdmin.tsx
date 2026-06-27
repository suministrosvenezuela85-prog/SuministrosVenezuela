'use client';

import React, { useState } from 'react';
import { X, Shield, BarChart3, Trash2, CheckCircle2, AlertTriangle, Search, Activity, RefreshCw } from 'lucide-react';
import { CentroAcopioConDetalles, CategoriaNecesidad, EstatusCentro } from '../types/database.types';
import { supabase } from '../lib/supabaseClient';
import { vibrar } from '../lib/feedback';
import { getCategoriaLabel } from '../lib/categorias';

interface TabAdminProps {
  centros: CentroAcopioConDetalles[];
  onClose: () => void;
  refetch: () => Promise<void>;
}

export function TabAdmin({ centros, onClose, refetch }: TabAdminProps) {
  const [activeSubTab, setActiveSubTab] = useState<'centros' | 'necesidades'>('centros');
  const [filtroNombre, setFiltroNombre] = useState('');
  const [filtroSpamOnly, setFiltroSpamOnly] = useState(false);
  const [loadingAction, setLoadingAction] = useState<Record<string, boolean>>({});
  const [refreshing, setRefreshing] = useState(false);

  // --- 1. COMPUTAR ESTADÍSTICAS ---
  const totalCentros = centros.length;
  const centrosVerificados = centros.filter(c => c.verificado).length;
  
  // Extraer todas las necesidades individuales
  const todasLasNecesidades = centros.flatMap(centro => 
    (centro.necesidades || []).map(nec => ({
      ...nec,
      centroNombre: centro.nombre,
      centroMunicipio: centro.municipio,
      centroEstado: centro.estado
    }))
  );

  const totalNecesidades = todasLasNecesidades.length;

  // Necesidades críticas e intermedias
  const necesidadesCriticas = todasLasNecesidades.filter(n => n.urgencia === 'critico').length;
  const necesidadesParciales = todasLasNecesidades.filter(n => n.urgencia === 'parcial').length;

  // Reportes sospechosos de spam
  const necesidadesSpam = todasLasNecesidades.filter(n => {
    const score = n.votos_vigente - (2 * n.votos_no_vigente);
    return score <= -3 || n.votos_no_vigente >= 3;
  });

  // Distribución de categorías
  const categoriasCount: Record<CategoriaNecesidad, number> = {
    agua_hidratacion: 0,
    alimentos_no_perecederos: 0,
    medicinas_primeros_auxilios: 0,
    energia_electricidad: 0,
    higiene_personal: 0,
    ropa_mantas: 0
  };

  todasLasNecesidades.forEach(n => {
    if (n.categoria in categoriasCount) {
      categoriasCount[n.categoria as CategoriaNecesidad]++;
    }
  });

  // --- 2. ACCIONES DE MODERACIÓN ---
  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
    vibrar(50);
  };

  const handleEliminarCentro = async (id: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar este Centro de Acopio?\nEsta acción es irreversible y eliminará en cascada todas sus necesidades.')) return;
    
    setLoadingAction(prev => ({ ...prev, [id]: true }));
    try {
      const { error } = await supabase.from('centros_acopio').delete().eq('id', id);
      if (error) throw error;
      vibrar(200);
      await refetch();
    } catch (err: any) {
      alert(`Error al eliminar centro: ${err.message}`);
    } finally {
      setLoadingAction(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleEliminarNecesidad = async (id: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar este requerimiento de suministro?')) return;

    setLoadingAction(prev => ({ ...prev, [id]: true }));
    try {
      const { error } = await supabase.from('necesidades').delete().eq('id', id);
      if (error) throw error;
      vibrar(200);
      await refetch();
    } catch (err: any) {
      alert(`Error al eliminar necesidad: ${err.message}`);
    } finally {
      setLoadingAction(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleVerificarCentro = async (id: string, verificadoActualmente: boolean) => {
    setLoadingAction(prev => ({ ...prev, [id]: true }));
    try {
      const { error } = await supabase
        .from('centros_acopio')
        .update({ verificado: !verificadoActualmente })
        .eq('id', id);
      if (error) throw error;
      vibrar(100);
      await refetch();
    } catch (err: any) {
      alert(`Error al cambiar estado de verificación: ${err.message}`);
    } finally {
      setLoadingAction(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleLimpiarSpam = async (necesidadId: string) => {
    setLoadingAction(prev => ({ ...prev, [necesidadId]: true }));
    try {
      // 1. Limpiar votos en la tabla de necesidades
      const { error: necError } = await supabase
        .from('necesidades')
        .update({ votos_no_vigente: 0 })
        .eq('id', necesidadId);
      
      if (necError) throw necError;

      // 2. Opcional: borrar los registros de votos en contra
      await (supabase as any)
        .from('votos_registro')
        .delete()
        .eq('necesidad_id', necesidadId)
        .eq('tipo_voto', 'no_vigente');

      vibrar(100);
      await refetch();
    } catch (err: any) {
      alert(`Error al limpiar spam: ${err.message}`);
    } finally {
      setLoadingAction(prev => ({ ...prev, [necesidadId]: false }));
    }
  };

  // --- 3. FILTRADO ---
  const centrosFiltrados = centros.filter(c => {
    const coincideTexto = c.nombre.toLowerCase().includes(filtroNombre.toLowerCase()) ||
                          c.municipio.toLowerCase().includes(filtroNombre.toLowerCase()) ||
                          c.estado.toLowerCase().includes(filtroNombre.toLowerCase());
    
    // Si tiene necesidades con alto spam
    const tieneSpam = (c.necesidades || []).some(n => {
      const score = n.votos_vigente - (2 * n.votos_no_vigente);
      return score <= -3 || n.votos_no_vigente >= 3;
    });

    return coincideTexto && (!filtroSpamOnly || tieneSpam);
  });

  const necesidadesFiltradas = todasLasNecesidades.filter(n => {
    const coincideTexto = n.descripcion.toLowerCase().includes(filtroNombre.toLowerCase()) ||
                          n.centroNombre.toLowerCase().includes(filtroNombre.toLowerCase());
    
    const score = n.votos_vigente - (2 * n.votos_no_vigente);
    const esSpam = score <= -3 || n.votos_no_vigente >= 3;

    return coincideTexto && (!filtroSpamOnly || esSpam);
  });

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto flex flex-col max-w-md mx-auto shadow-2xl animate-slideUp">
      {/* Header */}
      <header className="bg-gray-900 text-white p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-red-500 fill-red-500/20" />
          <div>
            <h1 className="text-base font-bold">Panel de Administración</h1>
            <span className="text-[10px] text-gray-400 font-semibold uppercase">Moderar Reportes</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={handleRefresh} disabled={refreshing}
            className="p-2 hover:bg-gray-800 rounded-lg text-gray-300 active:scale-95 transition-transform"
            aria-label="Refrescar datos">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg text-gray-300"
            aria-label="Cerrar panel de administración">
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-4 space-y-4 pb-20">
        
        {/* --- SECCIÓN ESTADÍSTICAS --- */}
        <section className="bg-gray-900 text-white rounded-xl p-4 space-y-3.5 shadow-md">
          <h2 className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-red-500" />
            Métricas de la Emergencia
          </h2>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-800 p-2.5 rounded-lg border border-gray-700/50">
              <span className="text-[10px] font-bold text-gray-400 block uppercase leading-tight">Centros Totales</span>
              <span className="text-2xl font-black">{totalCentros}</span>
              <span className="text-[9px] text-emerald-400 font-bold block mt-0.5">✓ {centrosVerificados} Verificados</span>
            </div>
            <div className="bg-gray-800 p-2.5 rounded-lg border border-gray-700/50">
              <span className="text-[10px] font-bold text-gray-400 block uppercase leading-tight">Necesidades Activas</span>
              <span className="text-2xl font-black text-amber-500">{totalNecesidades}</span>
              <span className="text-[9px] text-red-400 font-bold block mt-0.5">⚠️ {necesidadesCriticas} Críticas</span>
            </div>
          </div>

          {/* Progreso por categoría */}
          <div className="space-y-1.5 pt-2 border-t border-gray-800/80">
            <span className="text-[10px] font-bold text-gray-400 block uppercase">Distribución de Suministros</span>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              {(Object.keys(categoriasCount) as CategoriaNecesidad[]).map(cat => {
                const count = categoriasCount[cat];
                const pct = totalNecesidades > 0 ? (count / totalNecesidades) * 100 : 0;
                return (
                  <div key={cat} className="space-y-0.5">
                    <div className="flex justify-between text-[10px] font-semibold">
                      <span className="truncate">{getCategoriaLabel(cat)}</span>
                      <span className="text-gray-400">{count}</span>
                    </div>
                    <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-red-600 h-full rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Spam warnings */}
          {necesidadesSpam.length > 0 && (
            <div className="p-2.5 bg-red-950/60 border border-red-900/60 text-red-300 rounded-lg text-xs flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
              <div>
                <span className="font-bold block text-red-400">Moderación urgente</span>
                Hay {necesidadesSpam.length} reportes marcados como spam por los usuarios.
              </div>
            </div>
          )}
        </section>

        {/* --- BUSQUEDA Y FILTRADO --- */}
        <section className="space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input type="text" placeholder="Buscar por nombre, estado..." value={filtroNombre} onChange={e => setFiltroNombre(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 font-medium text-gray-800" />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button onClick={() => setActiveSubTab('centros')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${activeSubTab === 'centros' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                Refugios ({centrosFiltrados.length})
              </button>
              <button onClick={() => setActiveSubTab('necesidades')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${activeSubTab === 'necesidades' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                Necesidades ({necesidadesFiltradas.length})
              </button>
            </div>

            <button onClick={() => setFiltroSpamOnly(!filtroSpamOnly)}
              className={`px-2.5 py-1 text-[10px] font-bold rounded border flex items-center gap-1 transition-all ${filtroSpamOnly ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
              <AlertTriangle className="w-3.5 h-3.5" />
              Solo Spam ({necesidadesSpam.length})
            </button>
          </div>
        </section>

        {/* --- LISTADO --- */}
        <section className="space-y-2">
          {activeSubTab === 'centros' ? (
            /* LISTADO DE CENTROS */
            centrosFiltrados.map(c => {
              const loading = loadingAction[c.id];
              return (
                <div key={c.id} className="border border-gray-100 p-3 rounded-xl bg-white shadow-sm flex flex-col justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-gray-900 text-sm leading-snug">{c.nombre}</h3>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${c.verificado ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'}`}>
                        {c.verificado ? 'Verificado' : 'Anónimo'}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-500 font-semibold block">{c.municipio}, {c.estado}</span>
                    <span className="text-[10px] text-gray-400 block truncate">{c.direccion}</span>
                  </div>

                  <div className="flex gap-2 pt-1 border-t border-gray-50">
                    <button onClick={() => handleVerificarCentro(c.id, c.verificado)} disabled={loading}
                      className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg border flex items-center justify-center gap-1.5 ${
                        c.verificado ? 'bg-white text-gray-700 border-gray-200' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                      }`}>
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      {c.verificado ? 'Quitar Verificación' : 'Verificar'}
                    </button>
                    
                    <button onClick={() => handleEliminarCentro(c.id)} disabled={loading}
                      className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 flex items-center justify-center gap-1 active:scale-95 transition-transform"
                      title="Eliminar refugio">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            /* LISTADO DE NECESIDADES */
            necesidadesFiltradas.map(n => {
              const loading = loadingAction[n.id];
              const score = n.votos_vigente - (2 * n.votos_no_vigente);
              const esSpam = score <= -3 || n.votos_no_vigente >= 3;

              return (
                <div key={n.id} className={`border p-3 rounded-xl shadow-sm flex flex-col justify-between gap-3 ${
                  esSpam ? 'bg-red-50/20 border-red-200' : 'bg-white border-gray-100'
                }`}>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded">
                        {getCategoriaLabel(n.categoria)}
                      </span>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="font-bold text-emerald-700">Sí ({n.votos_vigente})</span>
                        <span className="text-gray-300">|</span>
                        <span className="font-bold text-red-600">No ({n.votos_no_vigente})</span>
                      </div>
                    </div>

                    <p className="text-xs text-gray-900 font-bold leading-tight mt-1">{n.descripcion}</p>
                    <span className="text-[10px] text-gray-500 font-semibold block">Refugio: {n.centroNombre}</span>
                  </div>

                  <div className="flex gap-2 pt-1 border-t border-gray-50">
                    {esSpam && (
                      <button onClick={() => handleLimpiarSpam(n.id)} disabled={loading}
                        className="flex-1 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1">
                        <Activity className="w-3.5 h-3.5 shrink-0" />
                        Limpiar Spam
                      </button>
                    )}

                    <button onClick={() => handleEliminarNecesidad(n.id)} disabled={loading}
                      className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg flex items-center justify-center gap-1 active:scale-95 transition-transform"
                      title="Eliminar necesidad">
                      <Trash2 className="w-3.5 h-3.5" />
                      {!esSpam && <span className="text-[11px] font-bold">Eliminar</span>}
                    </button>
                  </div>
                </div>
              );
            })
          )}

          {activeSubTab === 'centros' && centrosFiltrados.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-10 font-semibold">No se encontraron centros de acopio.</p>
          )}

          {activeSubTab === 'necesidades' && necesidadesFiltradas.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-10 font-semibold">No se encontraron necesidades activas.</p>
          )}
        </section>
      </div>
    </div>
  );
}
