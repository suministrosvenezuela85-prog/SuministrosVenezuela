'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Check, ThumbsUp, ThumbsDown, AlertTriangle, Award, Eye, EyeOff, Share2, Phone, X } from 'lucide-react';
import { CentroAcopioConDetalles } from '../types/database.types';
import { supabase } from '../lib/supabaseClient';
import { obtenerLatLng, calcularDistanciaKm, generarFingerprint, formatRelativeTime } from '../lib/geo';
import { getCategoriaIcon, getCategoriaLabel, getUrgenciaStyles, getUrgenciaLabel, getEstatusBorderColor } from '../lib/categorias';
import { vibrar, generarEnlaceWhatsApp } from '../lib/feedback';

interface CentroCardProps {
  centro: CentroAcopioConDetalles;
}

export function CentroCard({ centro }: CentroCardProps) {
  const [votosLocal, setVotosLocal] = useState<Record<string, 'vigente' | 'no_vigente'>>({});
  const [votosIniciales, setVotosIniciales] = useState<Record<string, 'vigente' | 'no_vigente'>>({});
  const [votando, setVotando] = useState<Record<string, boolean>>({});
  const [verSpam, setVerSpam] = useState<Record<string, boolean>>({});
  const [showColaborarModal, setShowColaborarModal] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('suministros_sos_votos');
      if (stored) {
        const parsed = JSON.parse(stored);
        setVotosLocal(parsed);
        setVotosIniciales(parsed);
      }
    } catch { /* silenciar */ }
  }, []);

  const handleVotar = async (necesidadId: string, tipoVoto: 'vigente' | 'no_vigente') => {
    if (votando[necesidadId]) return;
    setVotando(prev => ({ ...prev, [necesidadId]: true }));

    const ejecutarVoto = async () => {
      const esRetractar = votosLocal[necesidadId] === tipoVoto;
      const nuevosVotos = { ...votosLocal };
      if (esRetractar) {
        delete nuevosVotos[necesidadId];
      } else {
        nuevosVotos[necesidadId] = tipoVoto;
      }
      setVotosLocal(nuevosVotos);
      localStorage.setItem('suministros_sos_votos', JSON.stringify(nuevosVotos));

      try {
        const fp = generarFingerprint();
        const { error } = await supabase.rpc('votar_necesidad_toggle', {
          p_necesidad_id: necesidadId,
          p_fingerprint: fp,
          p_tipo_voto: tipoVoto
        });

        if (error) {
          console.warn('Error al registrar voto:', error.message || error.code || JSON.stringify(error));
          setVotosLocal(votosLocal);
          localStorage.setItem('suministros_sos_votos', JSON.stringify(votosLocal));
        } else {
          vibrar(100);
        }
      } catch (err) {
        console.error('Error de red en votación:', err);
        setVotosLocal(votosLocal);
        localStorage.setItem('suministros_sos_votos', JSON.stringify(votosLocal));
      } finally {
        setVotando(prev => ({ ...prev, [necesidadId]: false }));
      }
    };

    // Geofencing
    const centroPosicion = obtenerLatLng(centro.coordenadas);
    if (centroPosicion && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const dist = calcularDistanciaKm(pos.coords.latitude, pos.coords.longitude, centroPosicion[0], centroPosicion[1]);
          if (dist > 15) {
            const ok = window.confirm(`⚠️ Estás a ${dist.toFixed(1)} km de este refugio.\n¿Deseas confirmar tu voto?`);
            if (!ok) { setVotando(prev => ({ ...prev, [necesidadId]: false })); return; }
          }
          ejecutarVoto();
        },
        () => ejecutarVoto(),
        { timeout: 5000 }
      );
    } else {
      ejecutarVoto();
    }
  };

  const compartirWhatsApp = () => {
    const necesidadesTexto = (centro.necesidades || [])
      .filter(n => n.estatus === 'pendiente')
      .map(n => `  • ${getCategoriaLabel(n.categoria)} (${n.urgencia.toUpperCase()}) — ${n.descripcion}`)
      .join('\n');

    const texto = `🚨 *SUMINISTROS SOS VENEZUELA* 🇻🇪\n\n*${centro.nombre}*\n📍 ${centro.municipio}, ${centro.estado}\n📋 ${centro.direccion}\n\n*Necesidades activas:*\n${necesidadesTexto || '  Sin necesidades reportadas'}\n\n🔗 Coordina en tiempo real.`;
    window.open(generarEnlaceWhatsApp(texto), '_blank');
  };

  const necesidadesFiltradas = (centro.necesidades || []).filter(n => n.estatus !== 'surtido');

  return (
    <div className={`bg-white rounded-xl shadow-sm border-t-4 ${getEstatusBorderColor(centro.estatus_general)} border-x border-b border-gray-100 overflow-hidden transition-all duration-300`}>
      <div className="p-4">
        <div className="flex justify-between items-start gap-2 mb-2">
          <h3 className="font-bold text-gray-900 text-lg leading-tight flex items-center gap-1">
            {centro.nombre}
            {centro.verificado && (
              <span className="inline-flex text-blue-600" title="Coordinador Verificado" aria-label="Centro verificado oficialmente">
                <Award className="w-5 h-5 fill-blue-500 text-white" />
              </span>
            )}
          </h3>
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={compartirWhatsApp} className="p-1 text-gray-400 hover:text-emerald-600 rounded transition-colors" aria-label="Compartir por WhatsApp" title="Compartir por WhatsApp">
              <Share2 className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100 whitespace-nowrap">
              {formatRelativeTime(centro.ultima_actualizacion)}
            </span>
          </div>
        </div>

        <div className="flex items-center text-gray-600 text-xs mb-4 gap-1">
          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-hidden="true" />
          <span className="font-medium text-gray-700">{centro.municipio}, {centro.estado}</span>
          {centro.coordenadas && (<><span className="text-gray-300">|</span><span className="text-[10px] font-semibold text-blue-600">GPS</span></>)}
          {centro.reportado_autenticado && (
            <><span className="text-gray-300">|</span><span className="text-[10px] font-semibold text-emerald-600" title="Reportado por usuario registrado">✓ Registrado</span></>
          )}
          {centro.gps_verificado && (
            <><span className="text-gray-300">|</span><span className="text-[10px] font-semibold text-indigo-600" title="Ubicación GPS del reportante verificada">📍 Verificado</span></>
          )}
          {!centro.verificado && !centro.reportado_autenticado && !centro.gps_verificado && (
            <><span className="text-gray-300">|</span><span className="text-[10px] font-medium text-gray-400" title="Reporte anónimo">Anónimo</span></>
          )}
          <span className="text-gray-300">|</span>
          <span className="truncate max-w-[150px]" title={centro.direccion}>{centro.direccion}</span>
        </div>

        <div className="space-y-3">
          {necesidadesFiltradas.length === 0 ? (
            <p className="text-xs text-emerald-600 font-semibold bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-lg flex items-center gap-1.5">
              <Check className="w-4 h-4 shrink-0" aria-hidden="true" /> Sin necesidades urgentes.
            </p>
          ) : (
            necesidadesFiltradas.map((necesidad) => {
              const votoInicial = votosIniciales[necesidad.id];
              const votoActual = votosLocal[necesidad.id];

              let extraV = 0;
              if (votoInicial === 'vigente' && votoActual !== 'vigente') extraV = -1;
              else if (votoInicial !== 'vigente' && votoActual === 'vigente') extraV = 1;

              let extraNV = 0;
              if (votoInicial === 'no_vigente' && votoActual !== 'no_vigente') extraNV = -1;
              else if (votoInicial !== 'no_vigente' && votoActual === 'no_vigente') extraNV = 1;

              const votosVigenteMostrados = Math.max(0, necesidad.votos_vigente + extraV);
              const votosNoVigenteMostrados = Math.max(0, necesidad.votos_no_vigente + extraNV);

              const yaVotoV = votoActual === 'vigente';
              const yaVotoNV = votoActual === 'no_vigente';

              const score = votosVigenteMostrados - (2 * votosNoVigenteMostrados);
              const esSpam = score <= -3 || votosNoVigenteMostrados >= 3;
              const oculto = esSpam && !verSpam[necesidad.id];

              return (
                <div key={necesidad.id} className={`border border-gray-100 rounded-lg p-3 transition-all ${esSpam ? 'bg-red-50/30 border-red-100/50' : 'bg-white'}`}>
                  {esSpam && (
                    <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-red-100/30">
                      <span className="text-[10px] font-bold text-red-700 bg-red-100/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" aria-hidden="true" /> Spam (Score: {score})
                      </span>
                      <button type="button" onClick={() => setVerSpam(prev => ({ ...prev, [necesidad.id]: !prev[necesidad.id] }))}
                        className="text-[10px] font-bold text-red-800 hover:underline flex items-center gap-1"
                        aria-label={oculto ? 'Mostrar contenido del reporte' : 'Ocultar reporte'}>
                        {oculto ? <><Eye className="w-3 h-3" /> Mostrar</> : <><EyeOff className="w-3 h-3" /> Ocultar</>}
                      </button>
                    </div>
                  )}

                  {!oculto ? (
                    <div className="animate-fadeIn">
                      <div className="flex justify-between items-start gap-2 mb-1.5">
                        <span className={`inline-flex items-center px-2 py-0.5 border text-xs font-semibold rounded-md ${getUrgenciaStyles(necesidad.urgencia)}`}>
                          {getCategoriaIcon(necesidad.categoria)}
                          {getCategoriaLabel(necesidad.categoria)} - {getUrgenciaLabel(necesidad.urgencia)}
                        </span>
                        <span className="text-xs font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">Cant: {necesidad.cantidad_requerida}</span>
                      </div>
                      <p className="text-gray-700 text-sm mb-3 font-medium">{necesidad.descripcion}</p>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2.5 border-t border-gray-50">
                        <span className="text-[11px] text-gray-500 font-semibold">¿Sigue vigente?</span>
                        <div className="flex items-center gap-2" role="group" aria-label="Votar vigencia del reporte">
                          <button onClick={() => handleVotar(necesidad.id, 'vigente')} disabled={votando[necesidad.id]}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${yaVotoV ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50 active:scale-95'} disabled:cursor-not-allowed`}
                            aria-label={`Votar que sí sigue vigente (${votosVigenteMostrados} votos)`} aria-pressed={yaVotoV}>
                            <ThumbsUp className="w-3.5 h-3.5" />Sí ({votosVigenteMostrados})
                          </button>
                          <button onClick={() => handleVotar(necesidad.id, 'no_vigente')} disabled={votando[necesidad.id]}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${yaVotoNV ? 'bg-red-600 text-white border-red-600' : 'bg-white text-red-700 border-red-200 hover:bg-red-50 active:scale-95'} disabled:cursor-not-allowed`}
                            aria-label={`Votar que no sigue vigente (${votosNoVigenteMostrados} votos)`} aria-pressed={yaVotoNV}>
                            <ThumbsDown className="w-3.5 h-3.5" />No ({votosNoVigenteMostrados})
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-xs italic">Reporte minimizado por votos de spam.</p>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Pie del Centro Card: Botón Colaborar */}
        <div className="mt-4 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setShowColaborarModal(true)}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all duration-200"
          >
            <Phone className="w-3.5 h-3.5 fill-white/10" />
            COLABORAR / CONTACTAR
          </button>
        </div>
      </div>

      {/* Modal de Colaboración y Contacto */}
      {showColaborarModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-gray-100 animate-scaleUp">
            {/* Header del Modal */}
            <div className="bg-emerald-600 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">Coordinar Ayuda</h3>
              <button onClick={() => setShowColaborarModal(false)} className="p-1 hover:bg-emerald-700 rounded transition-colors text-white" aria-label="Cerrar modal">
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Contenido */}
            <div className="p-5 space-y-4">
              <div className="space-y-1">
                <h4 className="font-bold text-gray-900 text-base leading-snug">{centro.nombre}</h4>
                <p className="text-[10px] text-gray-400 font-semibold">{centro.municipio}, {centro.estado}</p>
              </div>

              {centro.telefono_contacto ? (
                <div className="space-y-4">
                  <p className="text-xs text-gray-600 leading-relaxed font-medium">
                    Comunícate directamente con el coordinador de este refugio para coordinar la logística o entrega de suministros.
                  </p>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-400 font-bold block uppercase tracking-wider">Teléfono Coordinador</span>
                      <a href={`tel:${centro.telefono_contacto}`} className="text-sm font-bold text-emerald-800 hover:underline">
                        {centro.telefono_contacto}
                      </a>
                    </div>
                  </div>
                  
                  {/* Botón WhatsApp */}
                  <a
                    href={`https://wa.me/${centro.telefono_contacto.replace(/\D/g, '').startsWith('58') ? centro.telefono_contacto.replace(/\D/g, '') : '58' + centro.telefono_contacto.replace(/\D/g, '').replace(/^0/, '')}?text=${encodeURIComponent(
                      `Hola, vi tu reporte en Suministros SOS para el refugio *${centro.nombre}*. Quiero colaborar coordinando la entrega de suministros.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition-all text-center"
                  >
                    CONTACTAR POR WHATSAPP
                  </a>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-xl text-center">
                    <p className="text-xs text-amber-800 font-semibold leading-relaxed">
                      Este centro fue reportado de forma anónima o antes de la integración del número de contacto. No tiene teléfono registrado.
                    </p>
                  </div>
                  <p className="text-[10px] text-gray-400 leading-relaxed text-center font-medium">
                    Puedes acercarte a la dirección física indicada para ofrecer ayuda presencial:<br />
                    <span className="font-bold text-gray-700 block mt-1 bg-gray-50 border border-gray-100 p-2 rounded-lg">{centro.direccion}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
