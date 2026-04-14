/**
 * CollisionManager.ts — Sistema de colisiones
 * 
 * FASE 5: Enemigos y colisiones
 * - Detecta intersecciones (círculos) entre balas del jugador y enemigos
 * - Detecta intersecciones entre la nave del jugador y enemigos
 * - Lanza callbacks de puntuación cuando se destruye un enemigo
 */

import * as THREE from 'three';
import { EnemyManager, EnemyType } from './Enemy';
import type { EnemyData } from './Enemy';
import { ProjectileManager } from './Projectile';
import { Player } from './Player';
import { ExplosionManager, ExplosionSize } from './ExplosionManager';

export class CollisionManager {
  private enemyManager: EnemyManager;
  private projectileManager: ProjectileManager;
  private player: Player;
  private explosionManager: ExplosionManager;

  public onScore: ((points: number) => void) | null = null;
  public onPlayerHit: (() => void) | null = null;

  constructor(
    enemyManager: EnemyManager,
    projectileManager: ProjectileManager,
    player: Player,
    explosionManager: ExplosionManager
  ) {
    this.enemyManager = enemyManager;
    this.projectileManager = projectileManager;
    this.player = player;
    this.explosionManager = explosionManager;
  }

  private getEnemyCollisionCenterY(enemy: EnemyData): number {
    if (enemy.type === EnemyType.MISSILE) {
      // El mesh del misil está anclado al suelo y su cuerpo va hacia arriba.
      // Desplazamos el centro de colisión para que coincida con su silueta visual.
      return enemy.mesh.position.y + 0.8;
    }

    return enemy.mesh.position.y;
  }

  private getEnemyCollisionRadius(enemy: EnemyData): number {
    if (enemy.type === EnemyType.MISSILE) {
      return 1.0;
    }

    return enemy.radius;
  }

  public update(): void {
    const enemies = this.enemyManager.getActiveEnemies();
    const projectiles = this.projectileManager.getActiveProjectiles();

    // 1. Proyectiles vs Enemigos
    for (let i = 0; i < projectiles.length; i++) {
      const proj = projectiles[i];
      if (!proj.active) continue;

      for (let j = 0; j < enemies.length; j++) {
        const enemy = enemies[j];
        if (!enemy.active) continue;

        const enemyCenterY = this.getEnemyCollisionCenterY(enemy);
        const enemyRadius = this.getEnemyCollisionRadius(enemy);
        const dx = proj.mesh.position.x - enemy.mesh.position.x;
        const dy = proj.mesh.position.y - enemyCenterY;
        const dist = Math.hypot(dx, dy);
        
        if (dist < enemyRadius + 0.3) {
          // Colisión!
          // Destruir proyectil
          this.projectileManager.destroyProjectile(proj);
          
          // Destruir enemigo
          this.enemyManager.destroyEnemy(enemy);
          
          // Explosión
          this.explosionManager.spawn(enemy.mesh.position.clone(), ExplosionSize.SMALL);
          
          // Puntuación
          if (this.onScore) {
            this.onScore(enemy.scoreValue);
          }
          
          break; // El proyectil ya no existe
        }
      }
    }

    // 2. Jugador vs Enemigos
    if (this.player.mesh.visible) {
      const playerPos = this.player.getPosition();
      const playerRadius = 0.5; // Aproximación

      for (let j = 0; j < enemies.length; j++) {
        const enemy = enemies[j];
        if (!enemy.active) continue;

        const enemyCenterY = this.getEnemyCollisionCenterY(enemy);
        const enemyRadius = this.getEnemyCollisionRadius(enemy);
        const dx = playerPos.x - enemy.mesh.position.x;
        const dy = playerPos.y - enemyCenterY;
        const dist = Math.hypot(dx, dy);

        if (dist < enemyRadius + playerRadius) {
          // Destruir enemigo (opcional, para que no vuelva a matar)
          this.enemyManager.destroyEnemy(enemy);
          this.explosionManager.spawn(enemy.mesh.position.clone(), ExplosionSize.SMALL);

          // Matar al jugador
          if (this.onPlayerHit) {
            this.onPlayerHit();
          }
        }
      }
    }
  }
}
