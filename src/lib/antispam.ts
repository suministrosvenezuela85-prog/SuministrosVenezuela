// Sistema Anti-Spam — Suministros SOS 🇻🇪
// Utilidades de protección del lado del cliente contra spam, bots y abuso.

import { calcularDistanciaKm } from './geo';
import { generarFingerprint } from './geo';
import { CentroAcopioConDetalles } from '../types/database.types';

// ═══════════════════════════════════════════════════════════════
// 1. RATE LIMITING (COOLDOWN) POR DISPOSITIVO
// Máximo 3 reportes cada 15 minutos por fingerprint.
// ═══════════════════════════════════════════════════════════════

const STORAGE_KEY_RATE = 'sos_rate_limit';
const MAX_REPORTES = 3;
const VENTANA_MS = 15 * 60 * 1000; // 15 minutos

interface CooldownResult {
  permitido: boolean;
  segundosRestantes: number;
  reportesRestantes: number;
}

export function verificarCooldown(): CooldownResult {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RATE);
    if (!raw) return { permitido: true, segundosRestantes: 0, reportesRestantes: MAX_REPORTES };

    const timestamps: number[] = JSON.parse(raw);
    const ahora = Date.now();
    
    // Filtrar solo los timestamps dentro de la ventana activa
    const recientes = timestamps.filter(t => ahora - t < VENTANA_MS);
    
    if (recientes.length >= MAX_REPORTES) {
      // Encontrar cuánto falta para que expire el timestamp más antiguo
      const masAntiguo = Math.min(...recientes);
      const expira = masAntiguo + VENTANA_MS;
      const segundos = Math.ceil((expira - ahora) / 1000);
      return { permitido: false, segundosRestantes: Math.max(0, segundos), reportesRestantes: 0 };
    }

    return { permitido: true, segundosRestantes: 0, reportesRestantes: MAX_REPORTES - recientes.length };
  } catch {
    return { permitido: true, segundosRestantes: 0, reportesRestantes: MAX_REPORTES };
  }
}

export function registrarReporteEnCooldown(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RATE);
    const timestamps: number[] = raw ? JSON.parse(raw) : [];
    const ahora = Date.now();
    
    // Limpiar timestamps viejos y agregar el nuevo
    const recientes = timestamps.filter(t => ahora - t < VENTANA_MS);
    recientes.push(ahora);
    
    localStorage.setItem(STORAGE_KEY_RATE, JSON.stringify(recientes));
  } catch { /* silenciar en caso de localStorage lleno */ }
}

// ═══════════════════════════════════════════════════════════════
// 2. COOLDOWN POST-REGISTRO
// Cuentas con < 10 min de antigüedad: máx 1 reporte cada 10 min.
// ═══════════════════════════════════════════════════════════════

const VENTANA_NUEVO_USUARIO_MS = 10 * 60 * 1000; // 10 minutos

export function verificarCooldownPostRegistro(
  createdAt: string | undefined
): CooldownResult {
  if (!createdAt) {
    // Usuario anónimo — aplicar cooldown normal
    return verificarCooldown();
  }

  const ahora = Date.now();
  const creadoEn = new Date(createdAt).getTime();
  const edadCuentaMs = ahora - creadoEn;

  // Si la cuenta tiene más de 10 minutos, usar cooldown estándar
  if (edadCuentaMs > VENTANA_NUEVO_USUARIO_MS) {
    return verificarCooldown();
  }

  // Cuenta nueva: máximo 1 reporte cada 10 min
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RATE);
    if (!raw) return { permitido: true, segundosRestantes: 0, reportesRestantes: 1 };

    const timestamps: number[] = JSON.parse(raw);
    const recientes = timestamps.filter(t => ahora - t < VENTANA_NUEVO_USUARIO_MS);

    if (recientes.length >= 1) {
      const masAntiguo = Math.min(...recientes);
      const expira = masAntiguo + VENTANA_NUEVO_USUARIO_MS;
      const segundos = Math.ceil((expira - ahora) / 1000);
      return { permitido: false, segundosRestantes: Math.max(0, segundos), reportesRestantes: 0 };
    }

    return { permitido: true, segundosRestantes: 0, reportesRestantes: 1 };
  } catch {
    return { permitido: true, segundosRestantes: 0, reportesRestantes: 1 };
  }
}

// ═══════════════════════════════════════════════════════════════
// 3. HONEYPOT ANTI-BOT
// Campo oculto que los bots llenan pero los humanos no ven.
// ═══════════════════════════════════════════════════════════════

export function validarHoneypot(valor: string): boolean {
  // Retorna true si es VÁLIDO (campo vacío = humano), false si es bot
  return valor.trim() === '';
}

// ═══════════════════════════════════════════════════════════════
// 4. FILTRO DE CONTENIDO (PALABRAS PROHIBIDAS)
// Lista contextualizada para Venezuela + spam genérico.
// ═══════════════════════════════════════════════════════════════

const PALABRAS_PROHIBIDAS: RegExp[] = [
  // Insultos y groserías (español Venezuela)
  /\bcoño\b/i,
  /\bmaric[oó]n\b/i,
  /\bhijue?p/i,
  /\bmald[ií]t[oa]\b/i,
  /\bput[oa]\b/i,
  /\bverg[ao]\b/i,
  /\bculo\b/i,
  /\bmamagu?ev[oa]\b/i,
  /\bpend?ej[oa]\b/i,
  /\bidiota\b/i,
  /\bimbec?[ií]l\b/i,
  /\bestup?[ií]d[oa]\b/i,
  // Spam y contenido malicioso
  /\bcasino\b/i,
  /\bapostar?\b/i,
  /\bcripto\b/i,
  /\bbitcoin\b/i,
  /\bviagra\b/i,
  /\bxxx\b/i,
  /\bporn/i,
  /\bsex[oy]\b/i,
  /\bgana\s*dinero/i,
  /\bgratis\s*(dinero|d[oó]lar)/i,
  /\binvierte?\b/i,
  /\btelegram\.me\b/i,
  /\bwa\.me\b/i,
  /\bbit\.ly\b/i,
  /\btinyurl\b/i,
  // URLs sospechosas genéricas
  /https?:\/\//i,
  /www\./i,
  // Contenido político divisivo (para mantener neutralidad en emergencia)
  /\bfuera\s+(maduro|guaid[oó]|chavez|ch[aá]vez)\b/i,
];

interface FiltroResult {
  limpio: boolean;
  palabraDetectada: string | null;
}

export function filtrarContenido(textos: string[]): FiltroResult {
  const textoCompleto = textos.join(' ');
  
  for (const patron of PALABRAS_PROHIBIDAS) {
    const match = textoCompleto.match(patron);
    if (match) {
      return { limpio: false, palabraDetectada: match[0] };
    }
  }

  return { limpio: true, palabraDetectada: null };
}

// ═══════════════════════════════════════════════════════════════
// 5. DETECCIÓN DE DUPLICADOS GEOGRÁFICOS
// Busca centros existentes con nombre similar y a < 500m.
// ═══════════════════════════════════════════════════════════════

function similitudTexto(a: string, b: string): number {
  // Normalizar y comparar tokens
  const tokensA = a.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/);
  const tokensB = b.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/);
  
  let coincidencias = 0;
  for (const token of tokensA) {
    if (token.length < 3) continue; // Ignorar palabras cortas
    if (tokensB.some(t => t.includes(token) || token.includes(t))) {
      coincidencias++;
    }
  }

  const totalSignificativos = tokensA.filter(t => t.length >= 3).length;
  return totalSignificativos > 0 ? coincidencias / totalSignificativos : 0;
}

interface DuplicadoResult {
  esDuplicado: boolean;
  centroSimilar: CentroAcopioConDetalles | null;
  distanciaKm: number | null;
}

export function detectarDuplicadoGeografico(
  centros: CentroAcopioConDetalles[],
  nombreNuevo: string,
  latNueva: number | null,
  lngNueva: number | null
): DuplicadoResult {
  if (!latNueva || !lngNueva) {
    // Sin coordenadas, solo comparar por nombre
    for (const centro of centros) {
      if (similitudTexto(nombreNuevo, centro.nombre) >= 0.6) {
        return { esDuplicado: true, centroSimilar: centro, distanciaKm: null };
      }
    }
    return { esDuplicado: false, centroSimilar: null, distanciaKm: null };
  }

  for (const centro of centros) {
    // Extraer coordenadas del centro existente
    let latExistente: number | null = null;
    let lngExistente: number | null = null;

    if (centro.coordenadas) {
      if (typeof centro.coordenadas === 'object' && 'x' in centro.coordenadas && 'y' in centro.coordenadas) {
        latExistente = centro.coordenadas.y;
        lngExistente = centro.coordenadas.x;
      } else if (typeof centro.coordenadas === 'string') {
        const match = (centro.coordenadas as string).match(/\(([^,]+),([^)]+)\)/);
        if (match) {
          lngExistente = parseFloat(match[1]);
          latExistente = parseFloat(match[2]);
        }
      }
    }

    // Verificar proximidad geográfica (< 500m)
    if (latExistente && lngExistente) {
      const distancia = calcularDistanciaKm(latNueva, lngNueva, latExistente, lngExistente);
      if (distancia < 0.5) {
        return { esDuplicado: true, centroSimilar: centro, distanciaKm: distancia };
      }
    }

    // También verificar nombre similar sin importar distancia
    if (similitudTexto(nombreNuevo, centro.nombre) >= 0.6) {
      let dist: number | null = null;
      if (latExistente && lngExistente) {
        dist = calcularDistanciaKm(latNueva, lngNueva, latExistente, lngExistente);
      }
      if (dist === null || dist < 5) { // Similar nombre y < 5km
        return { esDuplicado: true, centroSimilar: centro, distanciaKm: dist };
      }
    }
  }

  return { esDuplicado: false, centroSimilar: null, distanciaKm: null };
}

// ═══════════════════════════════════════════════════════════════
// 6. VALIDACIÓN GEOGRÁFICA (DISTANCIA REPORTE vs GPS USUARIO)
// Si la distancia es > 300km, el reporte se marca como no verificado.
// ═══════════════════════════════════════════════════════════════

export function validarDistanciaGPS(
  latUsuario: number | null,
  lngUsuario: number | null,
  latReporte: number | null,
  lngReporte: number | null
): boolean {
  // Si no hay datos de GPS del usuario o del reporte, no podemos validar → permitir
  if (!latUsuario || !lngUsuario || !latReporte || !lngReporte) return true;
  
  const distancia = calcularDistanciaKm(latUsuario, lngUsuario, latReporte, lngReporte);
  return distancia <= 300; // true = GPS verificado, false = sospechoso
}

// ═══════════════════════════════════════════════════════════════
// 7. CAPTCHA LIGERO LOCAL (Sin red, zero dependencias)
// Preguntas simples sobre Venezuela que solo humanos reales contestan.
// ═══════════════════════════════════════════════════════════════

interface PreguntaCaptcha {
  pregunta: string;
  respuestas: string[]; // Respuestas válidas (normalizadas)
}

const PREGUNTAS_CAPTCHA: PreguntaCaptcha[] = [
  { pregunta: '¿Cuál es la capital de Venezuela?', respuestas: ['caracas'] },
  { pregunta: '¿De qué color es la franja del medio de la bandera de Venezuela?', respuestas: ['azul'] },
  { pregunta: '¿Cuántas estrellas tiene la bandera de Venezuela?', respuestas: ['8', 'ocho'] },
  { pregunta: '¿Cuál es la moneda oficial de Venezuela?', respuestas: ['bolivar', 'bolívar', 'bolivares', 'bolívares', 'bs'] },
  { pregunta: '¿En qué continente está Venezuela?', respuestas: ['america', 'américa', 'sudamerica', 'sudamérica', 'sur america'] },
  { pregunta: '¿Cuál es el lago más grande de Venezuela?', respuestas: ['maracaibo'] },
  { pregunta: '¿Cuántos estados tiene Venezuela? (sin contar el Distrito Capital)', respuestas: ['23', 'veintitrés', 'veintitres'] },
];

export function obtenerPreguntaCaptcha(): PreguntaCaptcha {
  const idx = Math.floor(Math.random() * PREGUNTAS_CAPTCHA.length);
  return PREGUNTAS_CAPTCHA[idx];
}

export function validarRespuestaCaptcha(pregunta: PreguntaCaptcha, respuesta: string): boolean {
  const normalizada = respuesta.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return pregunta.respuestas.some(r => normalizada.includes(r));
}
