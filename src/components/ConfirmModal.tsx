'use client';

import React from 'react';
import { AlertTriangle, X, Check } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  children: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  children,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">{title}</h3>
          </div>
        </div>

        <div className="text-sm text-gray-700 leading-relaxed">
          {children}
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-gray-900 hover:bg-black text-white font-bold text-sm rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            aria-label={confirmLabel}
          >
            <Check className="w-4 h-4" />
            {confirmLabel}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 bg-white text-gray-700 border border-gray-200 font-bold text-sm rounded-xl hover:bg-gray-50 flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            aria-label={cancelLabel}
          >
            <X className="w-4 h-4" />
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
