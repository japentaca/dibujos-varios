/**
 * LevelEditor.ts — Lógica principal del editor manual
 */

import { EnemyManager, EnemyType } from './Enemy';
import { Terrain } from './Terrain';
import type { LevelData, LevelEnemyDef } from './LevelData';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../utils/constants';

export class LevelEditor {
  private enemyManager: EnemyManager;
  private terrain: Terrain;
  
  private curLevel: LevelData;
  private isActive: boolean = false;
  
  // UI Elements
  private editorLayer: HTMLElement;
  private btnSave: HTMLElement;
  private btnLoad: HTMLElement;
  private btnExit: HTMLElement;

  public onExit: (() => void) | null = null;

  constructor(enemyManager: EnemyManager, terrain: Terrain) {
    this.enemyManager = enemyManager;
    this.terrain = terrain;
    
    this.curLevel = {
      name: "Custom Level",
      seed: 42,
      enemies: []
    };

    this.editorLayer = document.getElementById('editor-layer') as HTMLElement;
    this.btnSave = document.getElementById('btn-save-level') as HTMLElement;
    this.btnLoad = document.getElementById('btn-load-level') as HTMLElement;
    this.btnExit = document.getElementById('btn-exit-editor') as HTMLElement;

    this.setupEvents();
  }

  private setupEvents(): void {
    // Draggables
    const tools = document.querySelectorAll('.editor-tool');
    tools.forEach(el => {
      el.addEventListener('dragstart', (e: Event) => {
        const dragEvent = e as DragEvent;
        const type = (el as HTMLElement).getAttribute('data-type');
        if (type && dragEvent.dataTransfer) {
          dragEvent.dataTransfer.setData('type', type);
        }
      });
    });

    // Drop Zone (toda la ventana)
    window.addEventListener('dragover', (e) => {
      if (!this.isActive) return;
      e.preventDefault(); // Permitir drop
    });

    window.addEventListener('drop', (e) => {
      if (!this.isActive) return;
      e.preventDefault();
      
      const typeStr = e.dataTransfer?.getData('type');
      if (typeStr === 'RADAR' || typeStr === 'MISSILE') {
        this.handleDrop(typeStr as EnemyType, e.clientX, e.clientY);
      }
    });

    // Buttons
    this.btnSave.addEventListener('click', () => this.saveLevel());
    this.btnLoad.addEventListener('click', () => this.loadLevelPrompt());
    this.btnExit.addEventListener('click', () => {
      if (this.onExit) this.onExit();
    });
  }

  public setActive(active: boolean): void {
    this.isActive = active;
    if (active) {
      if (this.editorLayer) this.editorLayer.classList.remove('hidden');
      this.enemyManager.isProcedural = false;
      this.enemyManager.clear();
      
      if ((this.terrain as any).setSeed) {
        (this.terrain as any).setSeed(this.curLevel.seed);
      }
      this.refreshEnemies();
    } else {
      if (this.editorLayer) this.editorLayer.classList.add('hidden');
      this.enemyManager.isProcedural = true;
      this.enemyManager.clear();
    }
  }

  private handleDrop(type: EnemyType, clientX: number, clientY: number): void {
    // Convertir de px de pantalla a coordenadas del mundo (Aproximación con cámara ortográfica)
    const nx = (clientX / window.innerWidth) * 2 - 1;
    const ny = -(clientY / window.innerHeight) * 2 + 1;
    
    // Obtener aspect ratio real
    const aspect = window.innerWidth / window.innerHeight;
    const viewWidth = WORLD_HEIGHT * aspect;
    
    // Local en pantalla
    const screenX = nx * (viewWidth / 2);
    const screenY = ny * (WORLD_HEIGHT / 2);

    // Global X basándonos en el offset actual del terreno
    const scrollOffset = this.terrain.getScrollOffset();
    const globalX = scrollOffset + screenX;

    // Determinar si clican en la mitad superior o inferior
    const isCeiling = screenY > 0;

    const newEnemy: LevelEnemyDef = { type, globalX, isCeiling };
    this.curLevel.enemies.push(newEnemy);

    // Spawn visual inmediato
    this.enemyManager.spawnManualEnemy(type, globalX, isCeiling);
  }

  public refreshEnemies(): void {
    this.enemyManager.clear();
    const currentScroll = this.terrain.getScrollOffset();
    
    // Dibujamos solo lo que esté relativamente cerca
    for (const en of this.curLevel.enemies) {
      if (Math.abs(en.globalX - currentScroll) < 60) {
        this.enemyManager.spawnManualEnemy(en.type, en.globalX, en.isCeiling);
      }
    }
  }

  private saveLevel(): void {
    const json = JSON.stringify(this.curLevel, null, 2);
    console.log("=== LEVEL JSON ===");
    console.log(json);
    prompt("Copia el JSON del nivel (también lo tienes en consola):", json);
  }

  private loadLevelPrompt(): void {
    const defaultJson = `{"name":"Custom Level","seed":42,"enemies":[]}`;
    const json = prompt("Pega el JSON del nivel:", defaultJson);
    if (json) {
      try {
        const parsed = JSON.parse(json);
        if (parsed.enemies && parsed.seed) {
          this.curLevel = parsed;
          if ((this.terrain as any).setSeed) {
            (this.terrain as any).setSeed(this.curLevel.seed);
          }
          this.refreshEnemies();
          alert("Nivel cargado correctamente.");
        }
      } catch (e) {
        alert("JSON inválido");
      }
    }
  }

  public getLevel(): LevelData {
    return this.curLevel;
  }
}
