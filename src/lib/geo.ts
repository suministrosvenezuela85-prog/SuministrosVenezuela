// Utilidades geográficas compartidas — Suministros SOS 🇻🇪

/**
 * Extrae latitud y longitud de un POINT de Postgres.
 * Supabase devuelve POINT como string "(lng,lat)" o como objeto {x, y}.
 */
export function obtenerLatLng(coordenadas: any): [number, number] | null {
  if (!coordenadas) return null;
  if (typeof coordenadas === 'object' && 'x' in coordenadas && 'y' in coordenadas) {
    return [coordenadas.y, coordenadas.x];
  }
  if (typeof coordenadas === 'string') {
    const match = coordenadas.match(/\(([^,]+),([^)]+)\)/);
    if (match) {
      const lng = parseFloat(match[1]);
      const lat = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return [lat, lng];
      }
    }
  }
  return null;
}

/**
 * Calcula la distancia geodésica entre dos puntos usando la Fórmula de Haversine.
 * Retorna la distancia en kilómetros.
 */
export function calcularDistanciaKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371; // Radio de la Tierra en Km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Genera un fingerprint simple del dispositivo para rate-limiting de votaciones.
 * No es criptográficamente seguro, pero suficiente para anti-spam básico.
 */
export function generarFingerprint(): string {
  if (typeof window === 'undefined') return 'server';
  const raw = [
    navigator.userAgent,
    screen.width,
    screen.height,
    screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
  ].join('|');

  // Hash simple (djb2)
  let hash = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) + hash) + raw.charCodeAt(i);
  }
  return 'fp_' + Math.abs(hash).toString(36);
}

/**
 * Formatea una fecha ISO en texto relativo legible en español.
 */
export function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();

    if (diffInMs < 0) return 'Hace un momento';

    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    if (diffInMins < 1) return 'Hace un momento';
    if (diffInMins < 60) return `Hace ${diffInMins} min`;

    const diffInHours = Math.floor(diffInMins / 60);
    if (diffInHours < 24) return `Hace ${diffInHours} ${diffInHours === 1 ? 'hora' : 'horas'}`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `Hace ${diffInDays} ${diffInDays === 1 ? 'día' : 'días'}`;
  } catch {
    return 'Recientemente';
  }
}
