/**
 * constants.ts — Constantes globales del juego Penetrator-3D
 * 
 * Centraliza todos los valores numéricos y de configuración
 * para facilitar el ajuste y balanceo del juego.
 */

// ==========================================
// DIMENSIONES DEL MUNDO (cámara ortográfica)
// ==========================================

/** Ancho del viewport del juego en unidades del mundo */
export const WORLD_WIDTH = 40;

/** Alto del viewport del juego en unidades del mundo */
export const WORLD_HEIGHT = 22.5;

// ==========================================
// NAVE DEL JUGADOR
// ==========================================

/** Escala de la nave del jugador */
export const PLAYER_SCALE = 0.8;

/** Velocidad de movimiento horizontal del jugador (unidades/segundo) */
export const PLAYER_SPEED_X = 12;

/** Velocidad de movimiento vertical del jugador (unidades/segundo) */
export const PLAYER_SPEED_Y = 10;

/** Posición X inicial del jugador */
export const PLAYER_START_X = -WORLD_WIDTH / 2 + 6;

/** Posición Y inicial del jugador */
export const PLAYER_START_Y = 0;

/** Margen mínimo desde los bordes del mundo */
export const PLAYER_MARGIN = 1.5;

// ==========================================
// COLORES — Paleta retro neón verde
// ==========================================

/** Color principal del fósforo verde (estilo ZX Spectrum) */
export const COLOR_NEON_GREEN = 0x00ff41;

/** Color verde brillante para efectos */
export const COLOR_BRIGHT_GREEN = 0x39ff14;

/** Color verde oscuro para sombras y terreno */
export const COLOR_DARK_GREEN = 0x004d00;

/** Color de fondo (negro CRT) */
export const COLOR_BACKGROUND = 0x000000;

/** Color de las estrellas */
export const COLOR_STARS = 0x00ff41;

/** Color rojo para explosiones y daño */
export const COLOR_RED = 0xff0040;

/** Color amarillo para destellos */
export const COLOR_YELLOW = 0xffff00;

// ==========================================
// VELOCIDAD DEL JUEGO
// ==========================================

/** Velocidad de scroll del terreno (unidades/segundo) */
export const SCROLL_SPEED = 8;

/** Velocidad de los misiles del jugador */
export const MISSILE_SPEED = 25;

/** Velocidad de las bombas (caída) */
export const BOMB_SPEED = 15;

// ==========================================
// GAMEPLAY
// ==========================================

/** Número de vidas iniciales */
export const INITIAL_LIVES = 3;

/** Frecuencia máxima de disparo (segundos entre disparos) */
export const FIRE_RATE = 0.2;

/** Puntos por destruir un radar */
export const SCORE_RADAR = 100;

/** Puntos por destruir un misil enemigo */
export const SCORE_MISSILE = 50;

// ==========================================
// TERRENO PROCEDURAL
// ==========================================

/** Ancho de cada segmento de terreno (unidades del mundo) */
export const TERRAIN_SEGMENT_WIDTH = 1.0;

/** Número de segmentos visibles + buffer (cubrir pantalla + margen) */
export const TERRAIN_SEGMENT_COUNT = 60;

/** Altura base del suelo (desde el borde inferior) */
export const TERRAIN_FLOOR_BASE = -WORLD_HEIGHT / 2 + 3;

/** Altura base del techo (desde el borde superior) */
export const TERRAIN_CEILING_BASE = WORLD_HEIGHT / 2 - 3;

/** Amplitud máxima de ondulación del suelo */
export const TERRAIN_FLOOR_AMPLITUDE = 4.0;

/** Amplitud máxima de ondulación del techo */
export const TERRAIN_CEILING_AMPLITUDE = 4.0;

/** Gap mínimo entre suelo y techo (para que la nave pueda pasar) */
export const TERRAIN_MIN_GAP = 5.0;

/** Frecuencia del ruido (controla qué tan "montañoso" es) */
export const TERRAIN_NOISE_FREQ = 0.06;

/** Segunda frecuencia de ruido para detalle fino */
export const TERRAIN_NOISE_FREQ_DETAIL = 0.15;

/** Opacidad del relleno del terreno */
export const TERRAIN_FILL_OPACITY = 0.25;

/** Opacidad del borde del terreno */
export const TERRAIN_EDGE_OPACITY = 0.9;
