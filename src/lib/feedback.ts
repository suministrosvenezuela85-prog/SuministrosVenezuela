// Feedback háptico y notificaciones — Suministros SOS 🇻🇪

/**
 * Vibración háptica segura. Falla silenciosamente si no está soportada.
 */
export function vibrar(ms: number = 200): void {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(ms);
    }
  } catch { /* silenciar */ }
}

/**
 * Muestra una notificación nativa del navegador.
 * Solicita permisos si aún no fueron otorgados.
 */
export async function notificar(titulo: string, cuerpo: string): Promise<void> {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    if (Notification.permission === 'granted') {
      new Notification(titulo, {
        body: cuerpo,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
      });
    }
  } catch { /* silenciar */ }
}

/**
 * Emite un tono corto (beep) usando AudioContext.
 * Útil para alertas de actualización en tiempo real.
 */
export function beep(frequency: number = 520, durationMs: number = 120): void {
  try {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    gain.gain.value = 0.08; // Volumen bajo para no molestar

    oscillator.start();
    oscillator.stop(ctx.currentTime + durationMs / 1000);
  } catch { /* silenciar */ }
}

/**
 * Genera un enlace de compartir por WhatsApp pre-formateado.
 */
export function generarEnlaceWhatsApp(texto: string): string {
  return `https://wa.me/?text=${encodeURIComponent(texto)}`;
}
