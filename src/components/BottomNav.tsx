'use client';

import React from 'react';
import { Layers, PlusCircle, Map, Settings, Users } from 'lucide-react';

export type TabId = 'suministros' | 'reportar' | 'mapa' | 'desaparecidos' | 'ajustes';

interface BottomNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const TABS: { id: TabId; label: string; Icon: React.ComponentType<any> }[] = [
  { id: 'suministros', label: 'Inicio', Icon: Layers },
  { id: 'reportar', label: 'Reportar', Icon: PlusCircle },
  { id: 'mapa', label: 'Mapa', Icon: Map },
  { id: 'desaparecidos', label: 'Desaparecidos', Icon: Users },
  { id: 'ajustes', label: 'Ajustes', Icon: Settings },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 py-2.5 px-2 flex items-center justify-around z-40 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]"
      style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom))' }}
      role="tablist"
      aria-label="Navegación principal"
    >
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          onClick={() => onTabChange(id)}
          className={`flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform min-w-[50px] ${
            activeTab === id ? 'text-red-700 font-bold' : 'text-gray-400 font-semibold'
          }`}
          role="tab"
          aria-selected={activeTab === id}
          aria-controls={`panel-${id}`}
          aria-label={label}
        >
          <Icon className="w-5 h-5 shrink-0" />
          <span className="text-xs">{label}</span>
        </button>
      ))}
    </nav>
  );
}
