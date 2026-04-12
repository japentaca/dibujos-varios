/**
 * LevelData.ts — Definición de estructuras de niveles
 */
import { EnemyType } from './Enemy';

export interface LevelEnemyDef {
  type: EnemyType;
  globalX: number;
  isCeiling: boolean;
}

export interface LevelData {
  name: string;
  seed: number; // Por ahora el terreno sigue una semilla fija en niveles manuales
  enemies: LevelEnemyDef[];
}
