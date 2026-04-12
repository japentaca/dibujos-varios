/**
 * Terrain.ts — Sistema de terreno procedural con scroll infinito
 * 
 * FASE 3: Terreno procedural
 * - Generación procedural de montañas (suelo) y cavernas (techo)
 * - Scroll continuo de derecha a izquierda
 * - Ruido simplificado (sin dependencias externas)
 * - Relleno sólido semitransparente + borde brillante
 * - Líneas de textura interna para efecto retro
 * 
 * Estrategia: actualizar posiciones de vértices cada frame
 * relativas a la cámara. El scrollOffset avanza continuamente
 * y las alturas se muestrean del generador de ruido.
 */

import * as THREE from 'three';
import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  SCROLL_SPEED,
  TERRAIN_SEGMENT_WIDTH,
  TERRAIN_FLOOR_BASE,
  TERRAIN_CEILING_BASE,
  TERRAIN_FLOOR_AMPLITUDE,
  TERRAIN_CEILING_AMPLITUDE,
  TERRAIN_MIN_GAP,
  TERRAIN_NOISE_FREQ,
  TERRAIN_NOISE_FREQ_DETAIL,
  TERRAIN_FILL_OPACITY,
  TERRAIN_EDGE_OPACITY,
  COLOR_NEON_GREEN,
  COLOR_DARK_GREEN,
} from '../utils/constants';

// ============================================
// RUIDO PROCEDURAL (implementación propia)
// ============================================

/**
 * Generador de ruido pseudo-aleatorio con interpolación suave.
 * Produce resultados suaves y repetibles sin dependencias externas.
 */
class SimpleNoise {
  private perm: number[];

  constructor(seed: number = 42) {
    this.perm = [];
    for (let i = 0; i < 256; i++) {
      this.perm.push(i);
    }
    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807 + 11) % 2147483647;
      const j = s % (i + 1);
      [this.perm[i], this.perm[j]] = [this.perm[j], this.perm[i]];
    }
    this.perm = [...this.perm, ...this.perm];
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number): number {
    return (hash & 1) === 0 ? x : -x;
  }

  /** Ruido 1D suave en rango [-1, 1] */
  public noise1D(x: number): number {
    const xi = Math.floor(x) & 255;
    const xf = x - Math.floor(x);
    const u = this.fade(xf);
    return this.lerp(
      this.grad(this.perm[xi], xf),
      this.grad(this.perm[xi + 1], xf - 1),
      u
    );
  }

  /** Ruido fractal (FBM) con múltiples octavas */
  public fbm(x: number, octaves: number = 4, persistence: number = 0.5): number {
    let total = 0, amplitude = 1, frequency = 1, maxVal = 0;
    for (let i = 0; i < octaves; i++) {
      total += this.noise1D(x * frequency) * amplitude;
      maxVal += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }
    return total / maxVal;
  }
}

// ============================================
// CLASE TERRAIN
// ============================================

export class Terrain {
  /** Grupo contenedor (se añade a la escena) */
  public group: THREE.Group;

  /** Generadores de ruido */
  private floorNoise: SimpleNoise;
  private ceilingNoise: SimpleNoise;

  /** Offset global de scroll (avanza continuamente) */
  private scrollOffset: number = 0;

  /** Número de puntos del perfil de terreno */
  private pointCount: number;

  // ===== Geometrías del suelo =====
  private floorEdgeLine: THREE.Line;
  private floorEdgePositions: Float32Array;
  private floorFill: THREE.Mesh;
  private floorFillPositions: Float32Array;
  private floorTexLines: THREE.LineSegments;
  private floorTexPositions: Float32Array;

  // ===== Geometrías del techo =====
  private ceilingEdgeLine: THREE.Line;
  private ceilingEdgePositions: Float32Array;
  private ceilingFill: THREE.Mesh;
  private ceilingFillPositions: Float32Array;
  private ceilingTexLines: THREE.LineSegments;
  private ceilingTexPositions: Float32Array;

  /** Número de líneas de textura interna */
  private readonly TEX_LINE_COUNT = 5;

  constructor() {
    this.group = new THREE.Group();

    this.floorNoise = new SimpleNoise(42);
    this.ceilingNoise = new SimpleNoise(137);

    // Calcular cuántos puntos necesitamos para cubrir la pantalla + margen
    const screenWidth = WORLD_WIDTH + 4; // Margen extra a cada lado
    this.pointCount = Math.ceil(screenWidth / TERRAIN_SEGMENT_WIDTH) + 2;

    const pc = this.pointCount;
    const segCount = pc - 1; // Segmentos entre puntos

    // =====================
    // SUELO — Borde
    // =====================
    this.floorEdgePositions = new Float32Array(pc * 3);
    const floorEdgeGeom = new THREE.BufferGeometry();
    floorEdgeGeom.setAttribute('position', new THREE.BufferAttribute(this.floorEdgePositions, 3));
    this.floorEdgeLine = new THREE.Line(floorEdgeGeom, new THREE.LineBasicMaterial({
      color: COLOR_NEON_GREEN,
      transparent: true,
      opacity: TERRAIN_EDGE_OPACITY,
    }));
    this.group.add(this.floorEdgeLine);

    // SUELO — Relleno (2 triángulos por segmento = 6 vértices)
    this.floorFillPositions = new Float32Array(segCount * 6 * 3);
    const floorFillGeom = new THREE.BufferGeometry();
    floorFillGeom.setAttribute('position', new THREE.BufferAttribute(this.floorFillPositions, 3));
    this.floorFill = new THREE.Mesh(floorFillGeom, new THREE.MeshBasicMaterial({
      color: COLOR_DARK_GREEN,
      transparent: true,
      opacity: TERRAIN_FILL_OPACITY,
      side: THREE.DoubleSide,
    }));
    this.floorFill.position.z = -0.5;
    this.group.add(this.floorFill);

    // SUELO — Líneas de textura
    this.floorTexPositions = new Float32Array(this.TEX_LINE_COUNT * segCount * 2 * 3);
    const floorTexGeom = new THREE.BufferGeometry();
    floorTexGeom.setAttribute('position', new THREE.BufferAttribute(this.floorTexPositions, 3));
    this.floorTexLines = new THREE.LineSegments(floorTexGeom, new THREE.LineBasicMaterial({
      color: COLOR_NEON_GREEN,
      transparent: true,
      opacity: 0.07,
    }));
    this.floorTexLines.position.z = -0.3;
    this.group.add(this.floorTexLines);

    // =====================
    // TECHO — Borde
    // =====================
    this.ceilingEdgePositions = new Float32Array(pc * 3);
    const ceilEdgeGeom = new THREE.BufferGeometry();
    ceilEdgeGeom.setAttribute('position', new THREE.BufferAttribute(this.ceilingEdgePositions, 3));
    this.ceilingEdgeLine = new THREE.Line(ceilEdgeGeom, new THREE.LineBasicMaterial({
      color: COLOR_NEON_GREEN,
      transparent: true,
      opacity: TERRAIN_EDGE_OPACITY,
    }));
    this.group.add(this.ceilingEdgeLine);

    // TECHO — Relleno
    this.ceilingFillPositions = new Float32Array(segCount * 6 * 3);
    const ceilFillGeom = new THREE.BufferGeometry();
    ceilFillGeom.setAttribute('position', new THREE.BufferAttribute(this.ceilingFillPositions, 3));
    this.ceilingFill = new THREE.Mesh(ceilFillGeom, new THREE.MeshBasicMaterial({
      color: COLOR_DARK_GREEN,
      transparent: true,
      opacity: TERRAIN_FILL_OPACITY,
      side: THREE.DoubleSide,
    }));
    this.ceilingFill.position.z = -0.5;
    this.group.add(this.ceilingFill);

    // TECHO — Líneas de textura
    this.ceilingTexPositions = new Float32Array(this.TEX_LINE_COUNT * segCount * 2 * 3);
    const ceilTexGeom = new THREE.BufferGeometry();
    ceilTexGeom.setAttribute('position', new THREE.BufferAttribute(this.ceilingTexPositions, 3));
    this.ceilingTexLines = new THREE.LineSegments(ceilTexGeom, new THREE.LineBasicMaterial({
      color: COLOR_NEON_GREEN,
      transparent: true,
      opacity: 0.07,
    }));
    this.ceilingTexLines.position.z = -0.3;
    this.group.add(this.ceilingTexLines);

    // Generar terreno inicial
    this.rebuildGeometry();
  }

  /**
   * Cambia la semilla de los ruidos e inicializa. (Útil para LevelEditor)
   */
  public setSeed(seed: number): void {
    this.floorNoise = new SimpleNoise(seed);
    // Para el techo, multiplicamos la semilla o usamos otra derivada
    this.ceilingNoise = new SimpleNoise(Math.floor(seed * 3.14159));
    this.rebuildGeometry();
  }

  /**
   * Avanza el scroll manualmente, usado principalmente por el LevelEditor
   */
  public addScrollOffset(offset: number): void {
    this.scrollOffset += offset;
    this.rebuildGeometry();
  }

  /**
   * Calcula la altura del suelo para una coordenada global X
   */
  public getFloorHeight(globalX: number): number {
    const n = this.floorNoise.fbm(globalX * TERRAIN_NOISE_FREQ, 4, 0.5);
    const d = this.floorNoise.noise1D(globalX * TERRAIN_NOISE_FREQ_DETAIL) * 0.3;
    return TERRAIN_FLOOR_BASE + (n + d) * TERRAIN_FLOOR_AMPLITUDE;
  }

  /**
   * Calcula la altura del techo para una coordenada global X
   */
  public getCeilingHeight(globalX: number): number {
    const n = this.ceilingNoise.fbm(globalX * TERRAIN_NOISE_FREQ, 4, 0.5);
    const d = this.ceilingNoise.noise1D(globalX * TERRAIN_NOISE_FREQ_DETAIL) * 0.3;
    let h = TERRAIN_CEILING_BASE + (n + d) * TERRAIN_CEILING_AMPLITUDE;

    // Garantizar gap mínimo
    const floorH = this.getFloorHeight(globalX);
    if (h - floorH < TERRAIN_MIN_GAP) {
      h = floorH + TERRAIN_MIN_GAP;
    }
    return h;
  }

  /**
   * Recalcula toda la geometría del terreno basándose en scrollOffset.
   * Las posiciones X son relativas a la pantalla (coordenadas de cámara).
   */
  private rebuildGeometry(): void {
    const halfW = WORLD_WIDTH / 2 + 2; // Margen extra
    const bottomEdge = -WORLD_HEIGHT / 2 - 2;
    const topEdge = WORLD_HEIGHT / 2 + 2;
    const segCount = this.pointCount - 1;

    for (let i = 0; i < this.pointCount; i++) {
      // Posición X en pantalla (de izquierda a derecha)
      const screenX = -halfW + i * TERRAIN_SEGMENT_WIDTH;

      // Posición X global (para muestrear el ruido)
      const globalX = screenX + this.scrollOffset;

      // Alturas
      const floorH = this.getFloorHeight(globalX);
      const ceilH = this.getCeilingHeight(globalX);

      // === BORDES ===
      const ei = i * 3;
      this.floorEdgePositions[ei] = screenX;
      this.floorEdgePositions[ei + 1] = floorH;
      this.floorEdgePositions[ei + 2] = 0;

      this.ceilingEdgePositions[ei] = screenX;
      this.ceilingEdgePositions[ei + 1] = ceilH;
      this.ceilingEdgePositions[ei + 2] = 0;

      // === RELLENOS Y TEXTURAS (por segmento, no por punto) ===
      if (i < segCount) {
        const nextScreenX = screenX + TERRAIN_SEGMENT_WIDTH;
        const nextGlobalX = nextScreenX + this.scrollOffset;
        const nextFloorH = this.getFloorHeight(nextGlobalX);
        const nextCeilH = this.getCeilingHeight(nextGlobalX);

        const fi = i * 18; // 6 vértices × 3 componentes

        // SUELO — Relleno (2 triángulos formando un quad)
        // Tri 1: esquina-abajo-izq, borde-izq, borde-der
        this.floorFillPositions[fi]      = screenX;
        this.floorFillPositions[fi + 1]  = bottomEdge;
        this.floorFillPositions[fi + 2]  = 0;
        this.floorFillPositions[fi + 3]  = screenX;
        this.floorFillPositions[fi + 4]  = floorH;
        this.floorFillPositions[fi + 5]  = 0;
        this.floorFillPositions[fi + 6]  = nextScreenX;
        this.floorFillPositions[fi + 7]  = nextFloorH;
        this.floorFillPositions[fi + 8]  = 0;
        // Tri 2: esquina-abajo-izq, borde-der, esquina-abajo-der
        this.floorFillPositions[fi + 9]  = screenX;
        this.floorFillPositions[fi + 10] = bottomEdge;
        this.floorFillPositions[fi + 11] = 0;
        this.floorFillPositions[fi + 12] = nextScreenX;
        this.floorFillPositions[fi + 13] = nextFloorH;
        this.floorFillPositions[fi + 14] = 0;
        this.floorFillPositions[fi + 15] = nextScreenX;
        this.floorFillPositions[fi + 16] = bottomEdge;
        this.floorFillPositions[fi + 17] = 0;

        // TECHO — Relleno
        this.ceilingFillPositions[fi]      = screenX;
        this.ceilingFillPositions[fi + 1]  = topEdge;
        this.ceilingFillPositions[fi + 2]  = 0;
        this.ceilingFillPositions[fi + 3]  = screenX;
        this.ceilingFillPositions[fi + 4]  = ceilH;
        this.ceilingFillPositions[fi + 5]  = 0;
        this.ceilingFillPositions[fi + 6]  = nextScreenX;
        this.ceilingFillPositions[fi + 7]  = nextCeilH;
        this.ceilingFillPositions[fi + 8]  = 0;
        this.ceilingFillPositions[fi + 9]  = screenX;
        this.ceilingFillPositions[fi + 10] = topEdge;
        this.ceilingFillPositions[fi + 11] = 0;
        this.ceilingFillPositions[fi + 12] = nextScreenX;
        this.ceilingFillPositions[fi + 13] = nextCeilH;
        this.ceilingFillPositions[fi + 14] = 0;
        this.ceilingFillPositions[fi + 15] = nextScreenX;
        this.ceilingFillPositions[fi + 16] = topEdge;
        this.ceilingFillPositions[fi + 17] = 0;

        // === LÍNEAS DE TEXTURA ===
        for (let ln = 0; ln < this.TEX_LINE_COUNT; ln++) {
          const t = (ln + 1) / (this.TEX_LINE_COUNT + 1);
          const ti = (i * this.TEX_LINE_COUNT + ln) * 6;

          // Suelo: líneas horizontales proporcionales
          const fTexY = bottomEdge + t * (floorH - bottomEdge);
          const fTexYNext = bottomEdge + t * (nextFloorH - bottomEdge);
          this.floorTexPositions[ti]     = screenX;
          this.floorTexPositions[ti + 1] = fTexY;
          this.floorTexPositions[ti + 2] = 0;
          this.floorTexPositions[ti + 3] = nextScreenX;
          this.floorTexPositions[ti + 4] = fTexYNext;
          this.floorTexPositions[ti + 5] = 0;

          // Techo: líneas horizontales proporcionales
          const cTexY = topEdge + t * (ceilH - topEdge);
          const cTexYNext = topEdge + t * (nextCeilH - topEdge);
          this.ceilingTexPositions[ti]     = screenX;
          this.ceilingTexPositions[ti + 1] = cTexY;
          this.ceilingTexPositions[ti + 2] = 0;
          this.ceilingTexPositions[ti + 3] = nextScreenX;
          this.ceilingTexPositions[ti + 4] = cTexYNext;
          this.ceilingTexPositions[ti + 5] = 0;
        }
      }
    }

    // Señalar que los buffers han cambiado
    this.floorEdgeLine.geometry.attributes.position.needsUpdate = true;
    this.floorFill.geometry.attributes.position.needsUpdate = true;
    this.floorTexLines.geometry.attributes.position.needsUpdate = true;
    this.ceilingEdgeLine.geometry.attributes.position.needsUpdate = true;
    this.ceilingFill.geometry.attributes.position.needsUpdate = true;
    this.ceilingTexLines.geometry.attributes.position.needsUpdate = true;
  }

  /**
   * Actualiza el terreno cada frame
   */
  public update(delta: number): void {
    this.scrollOffset += SCROLL_SPEED * delta;
    this.rebuildGeometry();
  }

  /**
   * Obtiene la altura del suelo en una posición X del mundo (pantalla)
   */
  public getFloorHeightAtWorldX(worldX: number): number {
    return this.getFloorHeight(worldX + this.scrollOffset);
  }

  /**
   * Obtiene la altura del techo en una posición X del mundo (pantalla)
   */
  public getCeilingHeightAtWorldX(worldX: number): number {
    return this.getCeilingHeight(worldX + this.scrollOffset);
  }

  /** Obtiene el offset de scroll actual */
  public getScrollOffset(): number {
    return this.scrollOffset;
  }
}
