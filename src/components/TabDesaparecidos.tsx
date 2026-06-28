'use client';

import React, { useState, useEffect } from 'react';
import { Search, MapPin, UserPlus, Phone, Trash2, Eye, EyeOff, Loader2, Heart, HelpCircle, ShieldAlert, Award } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { PersonaDesaparecida } from '../types/database.types';
import { useAuth } from '../hooks/useAuth';
import { generarFingerprint } from '../lib/geo';
import { vibrar } from '../lib/feedback';

export function TabDesaparecidos() {
  const [desaparecidos, setDesaparecidos] = useState<PersonaDesaparecida[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<'lista' | 'reportar'>('lista');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Formulario
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [edad, setEdad] = useState('');
  const [descripcionFisica, setDescripcionFisica] = useState('');
  const [ultimaUbicacion, setUltimaUbicacion] = useState('');
  const [contactoFamiliar, setContactoFamiliar] = useState('');
  const [fotoBase64, setFotoBase64] = useState<string | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [deviceFp, setDeviceFp] = useState('');

  const { user, isAdmin } = useAuth();

  useEffect(() => {
    setDeviceFp(generarFingerprint());
    fetchDesaparecidos();
  }, []);

  const fetchDesaparecidos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('personas_desaparecidas')
        .select('*')
        .order('estatus', { ascending: true }) // Primero los que están en búsqueda
        .order('creado_en', { ascending: false });
      
      if (error) throw error;
      setDesaparecidos(data || []);
    } catch (err) {
      console.error('Error al cargar desaparecidos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Procesar y comprimir la imagen en caliente usando Canvas
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 500;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Comprimir como JPEG al 75%
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
          setFotoBase64(compressedBase64);
          setFotoPreview(compressedBase64);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreCompleto.trim() || !ultimaUbicacion.trim() || !contactoFamiliar.trim()) {
      alert('⚠️ Por favor completa los campos requeridos (*)');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('personas_desaparecidas')
        .insert({
          nombre_completo: nombreCompleto.trim(),
          edad: edad ? parseInt(edad) : null,
          descripcion_fisica: descripcionFisica.trim() || null,
          ultima_ubicacion: ultimaUbicacion.trim(),
          contacto_familiar: contactoFamiliar.trim(),
          foto_base64: fotoBase64,
          estatus: 'busqueda',
          creado_por: user?.id || null,
          reportado_por_fingerprint: deviceFp
        });

      if (error) throw error;

      vibrar(200);
      alert('✅ Reporte de búsqueda publicado exitosamente.');
      
      // Reset
      setNombreCompleto(''); setEdad(''); setDescripcionFisica('');
      setUltimaUbicacion(''); setContactoFamiliar('');
      setFotoBase64(null); setFotoPreview(null);
      setMode('lista');
      fetchDesaparecidos();
    } catch (err: any) {
      console.error('Error al insertar desaparecido:', err);
      alert(`🛑 Error al enviar reporte: ${err.message || 'Error de conexión'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCambiarEstatus = async (id: string, nuevoEstatus: 'busqueda' | 'encontrado') => {
    const msg = nuevoEstatus === 'encontrado' 
      ? '🎉 ¿Confirmas que esta persona ha sido localizada a salvo?' 
      : '¿Volver a activar la búsqueda de esta persona?';
    
    if (!window.confirm(msg)) return;

    try {
      const { error } = await supabase
        .from('personas_desaparecidas')
        .update({ estatus: nuevoEstatus, ultima_actualizacion: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      vibrar(200);
      fetchDesaparecidos();
    } catch (err: any) {
      console.error('Error al actualizar estatus:', err);
      alert(`Error: ${err.message}`);
    }
  };

  const handleEliminarDesaparecido = async (id: string, nombre: string) => {
    if (!window.confirm(`⚠️ ¿Estás seguro de que deseas eliminar permanentemente la ficha de búsqueda de ${nombre}?`)) return;

    try {
      const { error } = await supabase
        .from('personas_desaparecidas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      vibrar(300);
      alert('🗑️ Publicación eliminada.');
      fetchDesaparecidos();
    } catch (err: any) {
      console.error('Error al eliminar desaparecido:', err);
      alert(`Error al eliminar: ${err.message}`);
    }
  };

  // Filtrar
  const desaparecidosFiltrados = desaparecidos.filter(p => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      p.nombre_completo.toLowerCase().includes(q) ||
      p.ultima_ubicacion.toLowerCase().includes(q) ||
      (p.descripcion_fisica && p.descripcion_fisica.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4">
      {/* Selector de modo */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
        <button
          onClick={() => setMode('lista')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all text-center ${
            mode === 'lista' ? 'bg-white text-red-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          🔎 BUSCAR DESAPARECIDOS
        </button>
        <button
          onClick={() => setMode('reportar')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all text-center ${
            mode === 'reportar' ? 'bg-white text-red-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          ➕ PUBLICAR BÚSQUEDA
        </button>
      </div>

      {mode === 'lista' ? (
        <div className="space-y-4">
          {/* Buscador */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar por nombre o última ubicación..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold text-gray-800 shadow-sm"
            />
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-red-700 animate-spin mb-2" />
              <span className="text-xs font-bold text-gray-400">Cargando personas no localizadas...</span>
            </div>
          ) : desaparecidosFiltrados.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 p-6">
              <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-800">No se encontraron reportes</p>
              <p className="text-xs text-gray-400 mt-1">Intenta con otra búsqueda o publica una nueva ficha de auxilio.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {desaparecidosFiltrados.map(p => {
                const esDueño = p.creado_por === user?.id || p.reportado_por_fingerprint === deviceFp || isAdmin;
                
                return (
                  <div key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col sm:flex-row gap-3 p-3 transition-all hover:shadow-md">
                    {/* Foto */}
                    <div className="w-full sm:w-28 h-28 bg-gray-100 rounded-lg shrink-0 overflow-hidden relative animate-fadeIn">
                      {p.foto_base64 ? (
                        <img src={p.foto_base64} alt={p.nombre_completo} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 p-2">
                          <EyeOff className="w-8 h-8 mb-1" />
                          <span className="text-[9px] font-bold uppercase">Sin foto</span>
                        </div>
                      )}
                      {/* Badge estatus */}
                      <span className={`absolute top-1.5 left-1.5 px-2 py-0.5 rounded text-[8px] font-extrabold tracking-wider text-white shadow-sm uppercase ${
                        p.estatus === 'busqueda' ? 'bg-red-600' : 'bg-emerald-600'
                      }`}>
                        {p.estatus === 'busqueda' ? '🚨 Buscando' : '✅ Encontrado'}
                      </span>
                    </div>

                    {/* Detalles */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="space-y-1">
                        <div className="flex justify-between items-start gap-1">
                          <h4 className="font-extrabold text-gray-900 text-sm">{p.nombre_completo}</h4>
                          {p.edad && <span className="text-[10px] font-bold text-gray-500 bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded-full">{p.edad} años</span>}
                        </div>
                        <div className="flex items-center text-gray-500 text-[10px] gap-0.5">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          <span className="font-semibold">{p.ultima_ubicacion}</span>
                        </div>
                        {p.descripcion_fisica && (
                          <p className="text-[10px] text-gray-600 leading-relaxed font-medium bg-gray-50 p-2 rounded-lg border border-gray-100/50">
                            <strong>Vestimenta/Señas:</strong> {p.descripcion_fisica}
                          </p>
                        )}
                      </div>

                      {/* Botón de Acción y Controles de Creador */}
                      <div className="mt-3 pt-2.5 border-t border-gray-100 flex flex-wrap gap-2 items-center justify-between">
                        {p.estatus === 'busqueda' ? (
                          <a
                            href={`https://wa.me/${p.contacto_familiar.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1 active:scale-95 transition-transform"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            TENGO INFORMACIÓN
                          </a>
                        ) : (
                          <span className="text-[10px] text-emerald-700 font-extrabold bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg">
                            🎉 Localizado con éxito
                          </span>
                        )}

                        {/* Modificar/Eliminar del Autor */}
                        {esDueño && (
                          <div className="flex gap-1">
                            {p.estatus === 'busqueda' ? (
                              <button
                                onClick={() => handleCambiarEstatus(p.id, 'encontrado')}
                                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[9px] font-bold px-2 py-1 rounded"
                                title="Marcar como localizado"
                              >
                                Marcar Encontrado
                              </button>
                            ) : (
                              <button
                                onClick={() => handleCambiarEstatus(p.id, 'busqueda')}
                                className="bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-[9px] font-bold px-2 py-1 rounded"
                                title="Reabrir búsqueda"
                              >
                                Reabrir
                              </button>
                            )}
                            <button
                              onClick={() => handleEliminarDesaparecido(p.id, p.nombre_completo)}
                              className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-[9px] font-bold p-1 rounded"
                              title="Eliminar publicación"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* FORMULARIO DE REPORTE */
        <form onSubmit={handleSubmit} className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm space-y-3.5">
          <h3 className="font-extrabold text-sm text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-1.5">
            📢 PUBLICAR FICHA DE AUXILIO
          </h3>

          <div className="space-y-1">
            <label htmlFor="nombre" className="block text-xs font-bold text-gray-600 uppercase">Nombre Completo *</label>
            <input
              id="nombre"
              type="text"
              placeholder="Ej. Juan Andrés Pérez..."
              value={nombreCompleto}
              onChange={e => setNombreCompleto(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 font-medium text-gray-800"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="edad" className="block text-xs font-bold text-gray-600 uppercase">Edad (Años)</label>
              <input
                id="edad"
                type="number"
                placeholder="Opcional..."
                value={edad}
                onChange={e => setEdad(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 font-medium text-gray-800"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="ubicacion" className="block text-xs font-bold text-gray-600 uppercase">Último avistamiento *</label>
              <input
                id="ubicacion"
                type="text"
                placeholder="Ej. Urb. La Isabelica, Valencia..."
                value={ultimaUbicacion}
                onChange={e => setUltimaUbicacion(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 font-medium text-gray-800"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="contacto" className="block text-xs font-bold text-gray-600 uppercase">Teléfono Familiar (WhatsApp) *</label>
            <input
              id="contacto"
              type="tel"
              placeholder="Ej. 04141234567 o +58414..."
              value={contactoFamiliar}
              onChange={e => setContactoFamiliar(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 font-medium text-gray-800"
              required
            />
            <p className="text-[9px] text-gray-400 font-medium leading-none mt-1">Este número será visible públicamente para que las personas puedan contactarte.</p>
          </div>

          <div className="space-y-1">
            <label htmlFor="detalles" className="block text-xs font-bold text-gray-600 uppercase">Descripción Física / Señas particulares</label>
            <textarea
              id="detalles"
              placeholder="Última ropa vista, color de cabello, estatura, señas particulares o alertas de salud..."
              value={descripcionFisica}
              onChange={e => setDescripcionFisica(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 font-medium text-gray-800 resize-none"
            />
          </div>

          {/* Subir foto */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-600 uppercase">Fotografía de la persona</label>
            <div className="flex items-center gap-3">
              <input
                id="foto-upload"
                type="file"
                accept="image/*"
                onChange={handleFotoChange}
                className="hidden"
              />
              <label
                htmlFor="foto-upload"
                className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold px-3 py-2 rounded-lg border border-gray-200 flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
              >
                📷 SELECCIONAR FOTO
              </label>

              {fotoPreview && (
                <div className="relative w-12 h-12 rounded border border-gray-200 overflow-hidden">
                  <img src={fotoPreview} alt="Vista previa" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setFotoBase64(null); setFotoPreview(null); }}
                    className="absolute inset-0 bg-black/50 text-white font-extrabold text-[8px] flex items-center justify-center"
                  >
                    QUITAR
                  </button>
                </div>
              )}
            </div>
            <p className="text-[9px] text-gray-400 font-medium leading-none">
              💡 La foto será comprimida automáticamente en tu navegador para agilizar la carga.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-red-700 hover:bg-red-800 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                PUBLICANDO...
              </>
            ) : (
              'PUBLICAR REPORTE DE BÚSQUEDA'
            )}
          </button>
        </form>
      )}
    </div>
  );
}
