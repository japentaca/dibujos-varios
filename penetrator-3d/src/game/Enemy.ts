/**
 * Enemy.ts — Sistema de enemigos
 * 
 * FASE 5: Enemigos (Radares y Misiles)
 * - Generador procedural vinculado al scroll (manteniendo consistencia)
 * - Radares: Estáticos, pegados al suelo o al techo.
 * - Misiles Enemigos: Pegados al suelo, despegan verticalmente cuando el jugador se acerca.
 */

import * as THREE from 'three';
import { Terrain } from './Terrain';
import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  COLOR_NEON_GREEN,
  COLOR_BRIGHT_GREEN,
  COLOR_RED,
  COLOR_DARK_GREEN,
  SCORE_RADAR,
  SCORE_MISSILE,
  SCROLL_SPEED
} from '../utils/constants';

export const EnemyType = {
  RADAR: 'RADAR',
  MISSILE: 'MISSILE'
} as const;

export type EnemyType = typeof EnemyType[keyof typeof EnemyType];

export interface EnemyData {
  mesh: THREE.Group;
  type: EnemyType;
  active: boolean;
  scoreValue: number;
  // Bounding radius para colisiones
  radius: number;
  
  // Específico para lógica
  globalX: number;
  baseY: number;
  
  // Para misiles
  launched?: boolean;
  velocity?: THREE.Vector2;
}

export class EnemyManager {
  public group: THREE.Group;
  private enemies: EnemyData[] = [];
  private terrain: Terrain;
  
  private lastSpawnGlobalX: number = 0;
  private readonly SPAWN_INTERVAL = 15; // Unidades del mundo entre posibles spawns
  
  public isProcedural: boolean = true; // Si es falso, no genera enemigos automáticamente

  constructor(terrain: Terrain) {
    this.group = new THREE.Group();
    this.terrain = terrain;
  }

  /**
   * Actualiza la generación y lógica de enemigos
   */
  public update(delta: number, playerGlobalX: number): void {
    const scrollOffset = this.terrain.getScrollOffset();
    
    // El borde derecho de la pantalla en coords globales
    const rightScreenGlobalX = scrollOffset + WORLD_WIDTH / 2 + 5; 

    // 1. Generación procedural de enemigos (si está activa)
    if (this.isProcedural) {
      if (rightScreenGlobalX - this.lastSpawnGlobalX >= this.SPAWN_INTERVAL) {
        this.lastSpawnGlobalX += this.SPAWN_INTERVAL;
        this.spawnRandomEnemy(this.lastSpawnGlobalX);
      }
    }

    // 2. Actualizar lógica de enemigos existentes
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (!enemy.active) continue;

      // El sprite del enemigo debe moverse hacia la izquierda para simular el scroll
      // Posición X en la pantalla = globalX - scrollOffset
      const screenX = enemy.globalX - scrollOffset;
      enemy.mesh.position.x = screenX;

      // Lógica específica de misiles enemigos
      if (enemy.type === EnemyType.MISSILE) {
        // Despegan si el jugador se acerca (ej: a menos de 15 unidades de distancia horizontal)
        // Ojo: screenX del jugador suele estar entre -10 y 0. Consideremos -5 como centro
        const PLAYER_SCREEN_X = -WORLD_WIDTH / 2 + 6; 
        const distanceToPlayer = screenX - PLAYER_SCREEN_X;

        if (!enemy.launched && distanceToPlayer < 18 && distanceToPlayer > 0 && Math.random() < 0.05) {
          // Probabilidad de despegue para no ser todos a la vez de forma robótica
          enemy.launched = true;
          enemy.velocity = new THREE.Vector2(0, 10); // Velocidad vertical
          
          // Cambiamos color del motor a rojo para indicar que está activo
          const engine = enemy.mesh.children.find(c => c.name === 'engine') as THREE.Mesh;
          if (engine) {
            (engine.material as THREE.MeshBasicMaterial).color.setHex(COLOR_RED);
          }
        }

        if (enemy.launched && enemy.velocity) {
          enemy.baseY += enemy.velocity.y * delta; // Sube
          enemy.mesh.position.y = enemy.baseY;
        }
      }

      // Eliminar si sale por la izquierda de la pantalla
      if (screenX < -WORLD_WIDTH / 2 - 5) {
        this.deactivateEnemy(i);
      }
    }
  }

  /**
   * Decide si generar un radar o misil en el globalX dado y en qué posición (suelo/techo)
   */
  private spawnRandomEnemy(globalX: number): void {
    // Ruido simple o aleatorio para decidir. Como es procedural, usemos Math.random para simplificar
    const rand = Math.random();
    if (rand < 0.3) return; // 30% de espacio vacío

    const isCeiling = Math.random() < 0.4; // 40% techo, 60% suelo
    let height = isCeiling ? this.terrain.getCeilingHeightAtWorldX(globalX) : this.terrain.getFloorHeightAtWorldX(globalX);

    if (rand < 0.7) {
      // Radar (colocable en techo o suelo)
      this.createRadar(globalX, height, isCeiling);
    } else {
      // Misil (solo suelo por ahora para respetar original, aunque se puede adaptar)
      const floorH = this.terrain.getFloorHeightAtWorldX(globalX);
      this.createMissile(globalX, floorH);
    }
  }

  /**
   * Generación manual para Editor o Niveles Cargados
   */
  public spawnManualEnemy(type: EnemyType, globalX: number, isCeiling: boolean): void {
    const y = isCeiling 
      ? this.terrain.getCeilingHeightAtWorldX(globalX) 
      : this.terrain.getFloorHeightAtWorldX(globalX);

    if (type === EnemyType.RADAR) {
      this.createRadar(globalX, y, isCeiling);
    } else {
      this.createMissile(globalX, y); // Fuerzo suelo por simplificar
    }
  }

  private createRadar(globalX: number, y: number, isCeiling: boolean): void {
    const group = new THREE.Group();

    // Base del radar
    const baseGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.6, 0, 0),
      new THREE.Vector3(0.6, 0, 0),
      new THREE.Vector3(0.3, 0.4, 0),
      new THREE.Vector3(-0.3, 0.4, 0),
      new THREE.Vector3(-0.6, 0, 0),
    ]);
    const baseMat = new THREE.LineBasicMaterial({ color: COLOR_NEON_GREEN });
    const base = new THREE.Line(baseGeo, baseMat);
    group.add(base);

    // Antena giratoria (podría animarse, por ahora estática o semigiratoria vía geometria)
    const dishGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.5, 0.7, 0),
      new THREE.Vector3(0.5, 0.4, 0),
    ]);
    const dish = new THREE.Line(dishGeo, baseMat);
    group.add(dish);

    // Centro parpadeante
    const coreMat = new THREE.MeshBasicMaterial({ color: COLOR_RED });
    const core = new THREE.Mesh(new THREE.CircleGeometry(0.15, 6), coreMat);
    core.position.set(0, 0.4, 0.01);
    group.add(core);

    if (isCeiling) {
      group.rotation.x = Math.PI; // Invertir
      group.position.y = y - 0.2;
    } else {
      group.position.y = y + 0.2;
    }

    this.group.add(group);

    this.enemies.push({
      mesh: group,
      type: EnemyType.RADAR,
      active: true,
      scoreValue: SCORE_RADAR,
      radius: 0.8,
      globalX,
      baseY: group.position.y
    });
  }

  private createMissile(globalX: number, y: number): void {
    const group = new THREE.Group();

    // Cuerpo vertical
    const bodyGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 1.2, 0),
    ]);
    const matLine = new THREE.LineBasicMaterial({ color: COLOR_NEON_GREEN });
    group.add(new THREE.Line(bodyGeo, matLine));

    // Aletas
    const finsGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.4, 0, 0),
      new THREE.Vector3(0.4, 0, 0),
      new THREE.Vector3(0, 0.4, 0),
      new THREE.Vector3(-0.4, 0, 0)
    ]);
    group.add(new THREE.Line(finsGeo, matLine));

    // Punta
    const tipGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.2, 1.2, 0),
      new THREE.Vector3(0.2, 1.2, 0),
      new THREE.Vector3(0, 1.6, 0),
      new THREE.Vector3(-0.2, 1.2, 0)
    ]);
    group.add(new THREE.Line(tipGeo, matLine));

    // Motor (apagado inicial)
    const engineMat = new THREE.MeshBasicMaterial({ color: COLOR_DARK_GREEN });
    const engine = new THREE.Mesh(new THREE.CircleGeometry(0.2, 6), engineMat);
    engine.name = 'engine';
    engine.position.set(0, -0.2, 0.01);
    group.add(engine);

    group.position.y = y;

    this.group.add(group);

    this.enemies.push({
      mesh: group,
      type: EnemyType.MISSILE,
      active: true,
      scoreValue: SCORE_MISSILE,
      radius: 0.8, // Centro relativo
      globalX,
      baseY: y,
      launched: false
    });
  }

  /**
   * Devuelve la lista de enemigos activos para colisiones
   */
  public getActiveEnemies(): EnemyData[] {
    return this.enemies.filter(e => e.active);
  }

  /**
   * Destruye un enemigo específico, eliminándolo de la escena
   */
  public destroyEnemy(enemy: EnemyData): void {
    const index = this.enemies.indexOf(enemy);
    if (index >= 0) {
      this.deactivateEnemy(index);
    }
  }

  private deactivateEnemy(index: number): void {
    const enemy = this.enemies[index];
    enemy.active = false;
    this.group.remove(enemy.mesh);

    enemy.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });

    this.enemies.splice(index, 1);
  }

  /**
   * Resetea el manager (ej: al morir)
   */
  public clear(): void {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      this.deactivateEnemy(i);
    }
    this.lastSpawnGlobalX = this.terrain.getScrollOffset() + WORLD_WIDTH;
  }
}
