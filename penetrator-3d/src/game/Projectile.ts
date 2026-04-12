/**
 * Projectile.ts — Sistema de proyectiles del jugador
 * 
 * FASE 4: Misiles y bombas con colisión contra terreno
 * - Misiles: vuelan horizontalmente hacia la derecha a alta velocidad
 * - Bombas: caen en parábola hacia abajo con gravedad
 * - Detección de impacto contra suelo y techo del terreno
 * - Generación de explosiones al impactar
 * - Efecto visual wireframe neón con estela luminosa
 * - Pool de objetos para rendimiento
 * - Sistema de partículas de destello al disparar
 */

import * as THREE from 'three';
import {
  MISSILE_SPEED,
  BOMB_SPEED,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  COLOR_NEON_GREEN,
  COLOR_BRIGHT_GREEN,
  COLOR_YELLOW,
} from '../utils/constants';
import { Terrain } from './Terrain';
import { ExplosionManager, ExplosionSize } from './ExplosionManager';

/** Tipos de proyectil */
export const ProjectileType = {
  MISSILE: 'MISSILE',
  BOMB: 'BOMB'
} as const;

export type ProjectileType = typeof ProjectileType[keyof typeof ProjectileType];

/** Datos de un proyectil individual */
interface ProjectileData {
  mesh: THREE.Group;
  type: ProjectileType;
  velocity: THREE.Vector2;
  active: boolean;
  time: number; // Para animaciones
}

export class ProjectileManager {
  /** Grupo contenedor de todos los proyectiles (se añade a la escena) */
  public group: THREE.Group;

  /** Pool de proyectiles activos */
  private projectiles: ProjectileData[] = [];

  /** Gravedad para las bombas (unidades/s²) */
  private readonly BOMB_GRAVITY = 18;

  /** Máximo de proyectiles simultáneos */
  private readonly MAX_PROJECTILES = 30;

  /** Partículas de destello al disparar */
  private flashParticles: THREE.Points;
  private flashPositions: Float32Array;
  private flashOpacities: Float32Array;
  private flashCount: number = 20;

  /** Referencia al terreno (para colisiones) — se asigna desde main.ts */
  private terrain: Terrain | null = null;

  /** Referencia al gestor de explosiones — se asigna desde main.ts */
  private explosionManager: ExplosionManager | null = null;

  constructor() {
    this.group = new THREE.Group();

    // =====================
    // SISTEMA DE PARTÍCULAS DE DESTELLO
    // =====================
    this.flashPositions = new Float32Array(this.flashCount * 3);
    this.flashOpacities = new Float32Array(this.flashCount);

    const flashGeometry = new THREE.BufferGeometry();
    flashGeometry.setAttribute('position', new THREE.BufferAttribute(this.flashPositions, 3));

    const flashMaterial = new THREE.PointsMaterial({
      color: COLOR_YELLOW,
      size: 0.12,
      transparent: true,
      opacity: 0,
      sizeAttenuation: false,
    });

    this.flashParticles = new THREE.Points(flashGeometry, flashMaterial);
    this.group.add(this.flashParticles);
  }

  /**
   * Conecta el sistema de terreno para colisiones proyectil-terreno
   */
  public setTerrain(terrain: Terrain): void {
    this.terrain = terrain;
  }

  /**
   * Conecta el gestor de explosiones
   */
  public setExplosionManager(explosionManager: ExplosionManager): void {
    this.explosionManager = explosionManager;
  }

  /**
   * Crea la geometría visual de un misil
   */
  private createMissileMesh(): THREE.Group {
    const group = new THREE.Group();

    // Cuerpo del misil (línea con punta)
    const bodyPoints = [
      new THREE.Vector3(-0.4, 0, 0),
      new THREE.Vector3(0.6, 0, 0),  // Punta
    ];
    const bodyGeometry = new THREE.BufferGeometry().setFromPoints(bodyPoints);
    const bodyMaterial = new THREE.LineBasicMaterial({
      color: COLOR_BRIGHT_GREEN,
    });
    group.add(new THREE.Line(bodyGeometry, bodyMaterial));

    // Punta triangular del misil
    const tipShape = new THREE.Shape();
    tipShape.moveTo(0.6, 0);
    tipShape.lineTo(0.3, 0.1);
    tipShape.lineTo(0.3, -0.1);
    tipShape.closePath();
    const tipGeometry = new THREE.ShapeGeometry(tipShape);
    const tipMaterial = new THREE.MeshBasicMaterial({
      color: COLOR_NEON_GREEN,
    });
    group.add(new THREE.Mesh(tipGeometry, tipMaterial));

    // Estela del misil (línea desvanecida)
    const trailPoints = [
      new THREE.Vector3(-0.4, 0, 0),
      new THREE.Vector3(-1.2, 0, 0),
    ];
    const trailGeometry = new THREE.BufferGeometry().setFromPoints(trailPoints);
    const trailMaterial = new THREE.LineBasicMaterial({
      color: COLOR_NEON_GREEN,
      transparent: true,
      opacity: 0.4,
    });
    group.add(new THREE.Line(trailGeometry, trailMaterial));

    // Punto brillante en la cola (motor)
    const dotGeometry = new THREE.CircleGeometry(0.06, 6);
    const dotMaterial = new THREE.MeshBasicMaterial({
      color: COLOR_BRIGHT_GREEN,
      transparent: true,
      opacity: 0.9,
    });
    const dot = new THREE.Mesh(dotGeometry, dotMaterial);
    dot.position.set(-0.4, 0, 0.01);
    group.add(dot);

    return group;
  }

  /**
   * Crea la geometría visual de una bomba
   */
  private createBombMesh(): THREE.Group {
    const group = new THREE.Group();

    // Cuerpo de la bomba (círculo pequeño)
    const bombGeometry = new THREE.CircleGeometry(0.15, 6);
    const bombMaterial = new THREE.MeshBasicMaterial({
      color: COLOR_NEON_GREEN,
      wireframe: true,
    });
    group.add(new THREE.Mesh(bombGeometry, bombMaterial));

    // Punto central brillante
    const coreGeometry = new THREE.CircleGeometry(0.05, 6);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: COLOR_BRIGHT_GREEN,
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.position.z = 0.01;
    group.add(core);

    // Aleta de la bomba
    const finPoints = [
      new THREE.Vector3(0, 0.15, 0),
      new THREE.Vector3(-0.2, 0.25, 0),
      new THREE.Vector3(-0.2, -0.25, 0),
      new THREE.Vector3(0, -0.15, 0),
    ];
    const finGeometry = new THREE.BufferGeometry().setFromPoints(finPoints);
    const finMaterial = new THREE.LineBasicMaterial({
      color: COLOR_NEON_GREEN,
      transparent: true,
      opacity: 0.6,
    });
    group.add(new THREE.Line(finGeometry, finMaterial));

    return group;
  }

  /**
   * Dispara un misil desde una posición dada
   */
  public fireMissile(position: THREE.Vector3): void {
    if (this.projectiles.filter(p => p.active).length >= this.MAX_PROJECTILES) return;

    const mesh = this.createMissileMesh();
    mesh.position.copy(position);
    this.group.add(mesh);

    this.projectiles.push({
      mesh,
      type: ProjectileType.MISSILE,
      velocity: new THREE.Vector2(MISSILE_SPEED, 0),
      active: true,
      time: 0,
    });

    // Efecto de destello al disparar
    this.spawnFlash(position);
  }

  /**
   * Lanza una bomba desde una posición dada
   */
  public fireBomb(position: THREE.Vector3): void {
    if (this.projectiles.filter(p => p.active).length >= this.MAX_PROJECTILES) return;

    const mesh = this.createBombMesh();
    mesh.position.copy(position);
    this.group.add(mesh);

    this.projectiles.push({
      mesh,
      type: ProjectileType.BOMB,
      velocity: new THREE.Vector2(BOMB_SPEED * 0.3, -BOMB_SPEED * 0.5), // Diagonal adelante-abajo
      active: true,
      time: 0,
    });

    // Efecto de destello al lanzar
    this.spawnFlash(position);
  }

  /**
   * Genera partículas de destello en una posición
   */
  private spawnFlash(position: THREE.Vector3): void {
    for (let i = 0; i < this.flashCount; i++) {
      const idx = i * 3;
      this.flashPositions[idx] = position.x + (Math.random() - 0.5) * 0.5;
      this.flashPositions[idx + 1] = position.y + (Math.random() - 0.5) * 0.3;
      this.flashPositions[idx + 2] = 0.1;
      this.flashOpacities[i] = 1;
    }
    this.flashParticles.geometry.attributes.position.needsUpdate = true;
    (this.flashParticles.material as THREE.PointsMaterial).opacity = 1;
  }

  /**
   * Comprueba si un proyectil colisiona con el terreno
   * Retorna true si hay colisión
   */
  private checkTerrainCollision(proj: ProjectileData): boolean {
    if (!this.terrain) return false;

    const x = proj.mesh.position.x;
    const y = proj.mesh.position.y;

    // Obtener alturas del terreno en la posición X del proyectil
    const floorH = this.terrain.getFloorHeightAtWorldX(x);
    const ceilingH = this.terrain.getCeilingHeightAtWorldX(x);

    // Colisión con el suelo (proyectil por debajo de la superficie)
    if (y <= floorH) {
      return true;
    }

    // Colisión con el techo (proyectil por encima de la superficie)
    if (y >= ceilingH) {
      return true;
    }

    return false;
  }

  /**
   * Genera una explosión en la posición de un proyectil
   */
  private triggerExplosion(proj: ProjectileData): void {
    if (!this.explosionManager) return;

    const explosionSize = proj.type === ProjectileType.BOMB
      ? ExplosionSize.LARGE
      : ExplosionSize.SMALL;

    this.explosionManager.spawn(
      proj.mesh.position.clone(),
      explosionSize
    );
  }

  /**
   * Actualiza todos los proyectiles activos
   */
  public update(delta: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      if (!proj.active) continue;

      proj.time += delta;

      // Mover el proyectil
      proj.mesh.position.x += proj.velocity.x * delta;
      proj.mesh.position.y += proj.velocity.y * delta;

      // Aplicar gravedad a las bombas
      if (proj.type === ProjectileType.BOMB) {
        proj.velocity.y -= this.BOMB_GRAVITY * delta;
        // Rotar la bomba mientras cae
        proj.mesh.rotation.z -= delta * 5;
      }

      // Efecto de parpadeo en misiles
      if (proj.type === ProjectileType.MISSILE) {
        const children = proj.mesh.children;
        if (children.length > 3) {
          // Parpadeamos el punto del motor
          const dot = children[3] as THREE.Mesh;
          const dotMat = dot.material as THREE.MeshBasicMaterial;
          dotMat.opacity = 0.5 + 0.5 * Math.sin(proj.time * 30);
        }
      }

      // =====================
      // COLISIÓN CON TERRENO (Fase 4)
      // =====================
      if (this.checkTerrainCollision(proj)) {
        this.triggerExplosion(proj);
        this.deactivateProjectile(i);
        continue; // Saltar al siguiente proyectil
      }

      // Eliminar si sale de la pantalla
      const halfW = WORLD_WIDTH / 2;
      const halfH = WORLD_HEIGHT / 2;
      if (
        proj.mesh.position.x > halfW + 2 ||
        proj.mesh.position.x < -halfW - 2 ||
        proj.mesh.position.y > halfH + 2 ||
        proj.mesh.position.y < -halfH - 2
      ) {
        this.deactivateProjectile(i);
      }
    }

    // Desvanecer partículas de destello
    const flashMat = this.flashParticles.material as THREE.PointsMaterial;
    if (flashMat.opacity > 0) {
      flashMat.opacity = Math.max(0, flashMat.opacity - delta * 5);
    }
  }

  /**
   * Desactiva y elimina un proyectil del pool
   */
  private deactivateProjectile(index: number): void {
    const proj = this.projectiles[index];
    proj.active = false;
    this.group.remove(proj.mesh);

    // Limpiar geometrías del mesh para liberar memoria
    proj.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });

    // Eliminar del array
    this.projectiles.splice(index, 1);
  }

  /**
   * Obtiene todos los proyectiles activos (para colisiones en fases futuras)
   */
  public getActiveProjectiles(): ProjectileData[] {
    return this.projectiles.filter(p => p.active);
  }

  /**
   * Obtiene el número de proyectiles activos
   */
  public getActiveCount(): number {
    return this.projectiles.filter(p => p.active).length;
  }

  /**
   * Destruye un proyectil por referencia (para uso del CollisionManager)
   * Genera explosión si hay ExplosionManager conectado
   */
  public destroyProjectile(proj: ProjectileData): void {
    const idx = this.projectiles.indexOf(proj);
    if (idx >= 0) {
      this.triggerExplosion(proj);
      this.deactivateProjectile(idx);
    }
  }
}
