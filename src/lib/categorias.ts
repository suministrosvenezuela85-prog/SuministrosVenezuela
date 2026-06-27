// Utilidades de categorías y constantes — Suministros SOS 🇻🇪
import React from 'react';
import {
  Droplet,
  Utensils,
  Heart,
  Zap,
  Activity,
  Sparkles,
} from 'lucide-react';

export const ESTADOS_VENEZUELA = [
  'Amazonas', 'Anzoátegui', 'Apure', 'Aragua', 'Barinas', 'Bolívar',
  'Carabobo', 'Cojedes', 'Delta Amacuro', 'Distrito Capital', 'Falcón',
  'Guárico', 'Lara', 'Mérida', 'Miranda', 'Monagas', 'Nueva Esparta',
  'Portuguesa', 'Sucre', 'Táchira', 'Trujillo', 'Yaracuy', 'Zulia', 'Vargas'
];

export function getCategoriaLabel(categoria: string): string {
  switch (categoria) {
    case 'agua_hidratacion': return 'Agua';
    case 'alimentos_no_perecederos': return 'Alimentos';
    case 'medicinas_primeros_auxilios': return 'Medicinas';
    case 'ropa_mantas': return 'Ropa/Mantas';
    case 'higiene_personal': return 'Higiene';
    case 'energia_electricidad': return 'Energía';
    default: return 'Suministro';
  }
}

export function getCategoriaIcon(categoria: string): React.ReactElement {
  const cls = "w-3.5 h-3.5 mr-1";
  switch (categoria) {
    case 'agua_hidratacion':
      return React.createElement(Droplet, { className: `${cls} text-blue-600` });
    case 'alimentos_no_perecederos':
      return React.createElement(Utensils, { className: `${cls} text-amber-600` });
    case 'medicinas_primeros_auxilios':
      return React.createElement(Heart, { className: `${cls} text-red-600` });
    case 'ropa_mantas':
      return React.createElement(Sparkles, { className: `${cls} text-indigo-600` });
    case 'higiene_personal':
      return React.createElement(Activity, { className: `${cls} text-emerald-600` });
    case 'energia_electricidad':
      return React.createElement(Zap, { className: `${cls} text-yellow-500` });
    default:
      return React.createElement(Activity, { className: `${cls} text-gray-600` });
  }
}

export function getUrgenciaStyles(urgencia: string): string {
  switch (urgencia) {
    case 'critico': return 'bg-red-50 text-red-700 border-red-200';
    case 'parcial': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'recibiendo': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    default: return 'bg-gray-50 text-gray-700 border-gray-200';
  }
}

export function getUrgenciaLabel(urgencia: string): string {
  switch (urgencia) {
    case 'critico': return 'CRÍTICO';
    case 'parcial': return 'Recibiendo';
    case 'recibiendo': return 'Estable';
    default: return 'Pendiente';
  }
}

export function getEstatusBorderColor(estatus: string): string {
  switch (estatus) {
    case 'critico': return 'border-t-red-600';
    case 'parcial': return 'border-t-amber-500';
    case 'surtido': return 'border-t-emerald-600';
    default: return 'border-t-gray-400';
  }
}

export function getEstatusMapColor(estatus: string): string {
  switch (estatus) {
    case 'critico': return '#dc2626';
    case 'parcial': return '#f59e0b';
    case 'surtido': return '#10b981';
    default: return '#6b7280';
  }
}
