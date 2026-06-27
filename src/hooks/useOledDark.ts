'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook para gestionar el modo oscuro OLED con persistencia en localStorage.
 */
export function useOledDark() {
  const [oledDark, setOledDark] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('suministros_sos_oled') === 'true';
    if (saved) {
      setOledDark(true);
      document.body.classList.add('oled-dark');
    }
  }, []);

  const toggleOledDark = useCallback(() => {
    setOledDark((prev) => {
      const next = !prev;
      if (next) {
        document.body.classList.add('oled-dark');
        localStorage.setItem('suministros_sos_oled', 'true');
      } else {
        document.body.classList.remove('oled-dark');
        localStorage.setItem('suministros_sos_oled', 'false');
      }
      return next;
    });
  }, []);

  return { oledDark, toggleOledDark };
}
