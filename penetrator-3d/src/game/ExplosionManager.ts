/**
 * ExplosionManager.ts — Sistema de explosiones y efectos de partículas
 * 
 * FASE 4: Explosiones al impacto
 * - Destello central brillante con fadeout rápido
 * - Fragmentos de metralla (chispas en múltiples direcciones)
 * - Onda expansiva tipo anillo wireframe
 * - Humo residual (partículas que se desvanecen lentamente)
 * - Dos tamaños: pequeña (misil) y grande (bomba)
 * 
 * Pool de explosiones con reciclado de geometrías.
 */

import * as THREE from 'three';
import {
  COLOR_NEON_GREEN,
  COLOR_BRIGHT_GREEN,
  COLOR_YELLOW,
  COLOR_RED,
} from '../utils/constants';

// ============================================
// CONSTANTES DE EXPLOSIONES
// ============================================

/** Número máximo de explosiones simultáneas */
const MAX_EXPLOSIONS = 20;

/** Número de fragmentos por explosión pequeña (misil) */
const FRAGMENT_COUNT_SMALL = 12;

/** Número de fragmentos por explosión grande (bomba) */
const FRAGMENT_COUNT_LARGE = 24;

/** Duración de vida de una explosión (segundos) */
const EXPLOSION_LIFETIME = 0.6;

/** Duración del destello central (segundos) */
const FLASH_DURATION = 0.12;

/** Velocidad de expansión de los fragmentos */
const FRAGMENT_SPEED = 15;

/** Velocidad de expansión del anillo de onda */
const RING_EXPAND_SPEED = 12;

/** Radio máximo del anillo de onda */
const RING_MAX_RADIUS = 2.5;

/** Número de segmentos del anillo de onda */
const RING_SEGMENTS = 24;

// ============================================
// TIPOS
// ============================================

/** Tamaño de la explosión */
export const ExplosionSize = {
  SMALL: 'SMALL',
  LARGE: 'LARGE'
} as const;

export type ExplosionSize = typeof ExplosionSize[keyof typeof ExplosionSize];

/** Datos de un fragmento individual */
interface FragmentData {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;    // 1.0 → 0.0
  size: number;
}

/** Datos de una explosión activa */
interface ExplosionData {
  /** Grupo visual contenedor */
  group: THREE.Group;
  /** Posición de origen */
  position: THREE.Vector3;
  /** Tamaño (pequeña/grande) */
  size: ExplosionSize;
  /** Tiempo transcurrido desde la creación */
  time: number;
  /** Estado activo */
  active: boolean;

  // === Componentes visuales ===
  /** Destello central (mesh circular) */
  flash: THREE.Mesh;
  /** Fragmentos como partículas */
  fragments: FragmentData[];
  fragmentPoints: THREE.Points;
  fragmentPositions: Float32Array;
  /** Anillo de onda expansiva */
  ring: THREE.LineLoop;
  ringPositions: Float32Array;
  /** Radio actual del anillo */
  ringRadius: number;
}

// ============================================
// CLASE EXPLOSIONMANAGER
// ============================================

export class ExplosionManager {
  /** Grupo contenedor (se añade a la escena) */
  public group: THREE.Group;

  /** Pool de explosiones */
  private explosions: ExplosionData[] = [];

  constructor() {
    this.group = new THREE.Group();
  }

  /**
   * Genera una explosión en la posición indicada
   * @param position — Centro de la explosión
   * @param size — Tamaño (SMALL para misil, LARGE para bomba)
   */
  public spawn(position: THREE.Vector3, size: ExplosionSize = ExplosionSize.SMALL): void {
    // Limitar número máximo de explosiones simultáneas
    if (this.explosions.filter(e => e.active).length >= MAX_EXPLOSIONS) {
      // Reciclar la más antigua
      const oldest = this.explosions.find(e => e.active);
      if (oldest) this.deactivate(oldest);
    }

    const explosionGroup = new THREE.Group();
    explosionGroup.position.copy(position);

    const isLarge = size === ExplosionSize.LARGE;
    const fragmentCount = isLarge ? FRAGMENT_COUNT_LARGE : FRAGMENT_COUNT_SMALL;

    // =====================
    // DESTELLO CENTRAL
    // =====================
    const flashRadius = isLarge ? 1.2 : 0.6;
    const flashGeom = new THREE.CircleGeometry(flashRadius, 12);
    const flashMat = new THREE.MeshBasicMaterial({
      color: COLOR_YELLOW,
      transparent: true,
      opacity: 1.0,
    });
    const flash = new THREE.Mesh(flashGeom, flashMat);
    flash.position.z = 0.2;
    explosionGroup.add(flash);

    // =====================
    // FRAGMENTOS (chispas)
    // =====================
    const fragmentPositions = new Float32Array(fragmentCount * 3);
    const fragments: FragmentData[] = [];

    for (let i = 0; i < fragmentCount; i++) {
      // Dirección aleatoria con distribución uniforme circular
      const angle = (Math.PI * 2 * i / fragmentCount) + (Math.random() - 0.5) * 0.5;
      const speed = FRAGMENT_SPEED * (0.3 + Math.random() * 0.7) * (isLarge ? 1.3 : 1.0);
      fragments.push({
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        size: 0.08 + Math.random() * 0.06,
      });
      fragmentPositions[i * 3] = 0;
      fragmentPositions[i * 3 + 1] = 0;
      fragmentPositions[i * 3 + 2] = 0.1;
    }

    const fragGeom = new THREE.BufferGeometry();
    fragGeom.setAttribute('position', new THREE.BufferAttribute(fragmentPositions, 3));

    const fragMat = new THREE.PointsMaterial({
      color: COLOR_BRIGHT_GREEN,
      size: 0.12,
      transparent: true,
      opacity: 1.0,
      sizeAttenuation: false,
    });
    const fragmentPoints = new THREE.Points(fragGeom, fragMat);
    explosionGroup.add(fragmentPoints);

    // =====================
    // ANILLO DE ONDA EXPANSIVA
    // =====================
    const ringPositions = new Float32Array((RING_SEGMENTS + 1) * 3);
    const ringGeom = new THREE.BufferGeometry();
    ringGeom.setAttribute('position', new THREE.BufferAttribute(ringPositions, 3));
    const ringMat = new THREE.LineBasicMaterial({
      color: COLOR_NEON_GREEN,
      transparent: true,
      opacity: 0.8,
    });
    const ring = new THREE.LineLoop(ringGeom, ringMat);
    ring.position.z = 0.15;
    explosionGroup.add(ring);

    // Inicializar posiciones del anillo (radio 0)
    this.updateRingPositions(ringPositions, 0.01);
    ringGeom.attributes.position.needsUpdate = true;

    // =====================
    // LÍNEAS DE IMPACTO (rayos saliendo del centro)
    // =====================
    const rayCount = isLarge ? 8 : 5;
    const rayPositions = new Float32Array(rayCount * 2 * 3);
    for (let i = 0; i < rayCount; i++) {
      const angle = (Math.PI * 2 * i / rayCount) + (Math.random() - 0.5) * 0.3;
      const len = (isLarge ? 2.0 : 1.2) * (0.5 + Math.random() * 0.5);
      const idx = i * 6;
      rayPositions[idx] = 0;
      rayPositions[idx + 1] = 0;
      rayPositions[idx + 2] = 0.12;
      rayPositions[idx + 3] = Math.cos(angle) * len;
      rayPositions[idx + 4] = Math.sin(angle) * len;
      rayPositions[idx + 5] = 0.12;
    }
    const rayGeom = new THREE.BufferGeometry();
    rayGeom.setAttribute('position', new THREE.BufferAttribute(rayPositions, 3));
    const rayMat = new THREE.LineBasicMaterial({
      color: COLOR_YELLOW,
      transparent: true,
      opacity: 0.9,
    });
    const rays = new THREE.LineSegments(rayGeom, rayMat);
    explosionGroup.add(rays);

    // =====================
    // SEGUNDO DESTELLO ROJO (interior, más pequeño)
    // =====================
    if (isLarge) {
      const innerFlashGeom = new THREE.CircleGeometry(flashRadius * 0.4, 8);
      const innerFlashMat = new THREE.MeshBasicMaterial({
        color: COLOR_RED,
        transparent: true,
        opacity: 0.8,
      });
      const innerFlash = new THREE.Mesh(innerFlashGeom, innerFlashMat);
      innerFlash.position.z = 0.25;
      explosionGroup.add(innerFlash);
    }

    // Añadir al grupo principal
    this.group.add(explosionGroup);

    // Registrar la explosión
    this.explosions.push({
      group: explosionGroup,
      position: position.clone(),
      size,
      time: 0,
      active: true,
      flash,
      fragments,
      fragmentPoints,
      fragmentPositions,
      ring,
      ringPositions,
      ringRadius: 0.01,
    });
  }

  /**
   * Actualiza las posiciones del anillo circular
   */
  private updateRingPositions(positions: Float32Array, radius: number): void {
    for (let i = 0; i <= RING_SEGMENTS; i++) {
      const angle = (Math.PI * 2 * i) / RING_SEGMENTS;
      const idx = i * 3;
      positions[idx] = Math.cos(angle) * radius;
      positions[idx + 1] = Math.sin(angle) * radius;
      positions[idx + 2] = 0;
    }
  }

  /**
   * Actualiza todas las explosiones activas
   */
  public update(delta: number): void {
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const exp = this.explosions[i];
      if (!exp.active) continue;

      exp.time += delta;

      // Progreso normalizado de la explosión (0 → 1)
      const progress = Math.min(1.0, exp.time / EXPLOSION_LIFETIME);
      const isLarge = exp.size === ExplosionSize.LARGE;

      // =====================
      // DESTELLO CENTRAL — desvanecimiento rápido
      // =====================
      const flashProgress = Math.min(1.0, exp.time / FLASH_DURATION);
      const flashMat = exp.flash.material as THREE.MeshBasicMaterial;
      flashMat.opacity = Math.max(0, 1.0 - flashProgress);
      // Escalar el destello hacia arriba rápidamente
      const flashScale = 1.0 + flashProgress * (isLarge ? 2.0 : 1.0);
      exp.flash.scale.set(flashScale, flashScale, 1);

      // =====================
      // FRAGMENTOS — mover y desvanecer
      // =====================
      const fragMat = exp.fragmentPoints.material as THREE.PointsMaterial;
      let anyFragAlive = false;

      for (let f = 0; f < exp.fragments.length; f++) {
        const frag = exp.fragments[f];
        if (frag.life <= 0) continue;

        anyFragAlive = true;

        // Mover fragmento + fricción
        frag.x += frag.vx * delta;
        frag.y += frag.vy * delta;
        frag.vx *= (1 - 3.0 * delta); // Fricción progresiva
        frag.vy *= (1 - 3.0 * delta);

        // Las chispas caen ligeramente con gravedad
        frag.vy -= 4.0 * delta;

        // Reducir vida
        frag.life -= delta / EXPLOSION_LIFETIME;

        // Actualizar posición en el buffer
        const idx = f * 3;
        exp.fragmentPositions[idx] = frag.x;
        exp.fragmentPositions[idx + 1] = frag.y;
        exp.fragmentPositions[idx + 2] = 0.1;
      }

      exp.fragmentPoints.geometry.attributes.position.needsUpdate = true;
      // Opacidad global de los fragmentos
      fragMat.opacity = Math.max(0, 1.0 - progress * 1.3);

      // =====================
      // ANILLO DE ONDA — expandir y desvanecer
      // =====================
      const ringMaxR = isLarge ? RING_MAX_RADIUS * 1.5 : RING_MAX_RADIUS;
      exp.ringRadius = Math.min(ringMaxR, exp.ringRadius + RING_EXPAND_SPEED * delta);
      this.updateRingPositions(exp.ringPositions, exp.ringRadius);
      exp.ring.geometry.attributes.position.needsUpdate = true;

      const ringMat = exp.ring.material as THREE.LineBasicMaterial;
      ringMat.opacity = Math.max(0, 0.8 * (1.0 - progress));

      // =====================
      // RAYOS — desvanecer junto con el destello
      // =====================
      const rays = exp.group.children[3]; // Cuarto hijo = rayos
      if (rays && rays instanceof THREE.LineSegments) {
        const rayMat = rays.material as THREE.LineBasicMaterial;
        rayMat.opacity = Math.max(0, 0.9 * (1.0 - flashProgress * 1.5));
      }

      // =====================
      // SEGUNDO DESTELLO ROJO (solo bombas)
      // =====================
      if (isLarge && exp.group.children.length > 4) {
        const innerFlash = exp.group.children[4] as THREE.Mesh;
        const innerMat = innerFlash.material as THREE.MeshBasicMaterial;
        innerMat.opacity = Math.max(0, 0.8 * (1.0 - flashProgress * 2));
        const innerScale = 1.0 + flashProgress * 3.0;
        innerFlash.scale.set(innerScale, innerScale, 1);
      }

      // =====================
      // FINALIZAR EXPLOSIÓN
      // =====================
      if (progress >= 1.0 && !anyFragAlive) {
        this.deactivate(exp);
        this.explosions.splice(i, 1);
      }
    }
  }

  /**
   * Desactiva y limpia una explosión
   */
  private deactivate(exp: ExplosionData): void {
    exp.active = false;
    this.group.remove(exp.group);

    // Limpiar geometrías y materiales
    exp.group.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Line || child instanceof THREE.Points) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }

  /**
   * Número de explosiones activas
   */
  public getActiveCount(): number {
    return this.explosions.filter(e => e.active).length;
  }
}
