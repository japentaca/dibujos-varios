/**
 * main.ts — Punto de entrada principal de Penetrator-3D
 *
 * FASE 8: Pulido y optimización
 * - GameState.PAUSED: pausa del reloj y congelado del delta
 * - Toggle Fullscreen con tecla F o botón HUD
 * - Controles táctiles para móviles (TouchControls)
 * - Revisión de fugas de memoria (dispose de geometrías)
 * - Mejoras CRT y efectos finales
 */

import * as THREE from 'three';
import { Player } from './game/Player';
import { ProjectileManager } from './game/Projectile';
import { Terrain } from './game/Terrain';
import { ExplosionManager, ExplosionSize } from './game/ExplosionManager';
import { EnemyManager } from './game/Enemy';
import { CollisionManager } from './game/CollisionManager';
import { UI } from './game/UI';
import { AudioManager } from './game/AudioManager';
import { TouchControls } from './game/TouchControls';
import { InputManager, InputAction } from './utils/InputManager';
import { LevelEditor } from './game/LevelEditor';
import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  COLOR_BACKGROUND,
  COLOR_NEON_GREEN,
  COLOR_STARS,
  SCROLL_SPEED,
  INITIAL_LIVES
} from './utils/constants';

// ============================================
// INICIALIZACIÓN DEL RENDERER
// ============================================

const container = document.getElementById('game-container')!;

const renderer = new THREE.WebGLRenderer({
  antialias: false,
  alpha: false,
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(COLOR_BACKGROUND);
container.appendChild(renderer.domElement);

// ============================================
// CÁMARA ORTOGRÁFICA
// ============================================

const aspect = window.innerWidth / window.innerHeight;
const viewHeight = WORLD_HEIGHT;
const viewWidth = viewHeight * aspect;

const camera = new THREE.OrthographicCamera(
  -viewWidth / 2,
  viewWidth / 2,
  viewHeight / 2,
  -viewHeight / 2,
  0.1,
  100
);
camera.position.z = 10;

// ============================================
// ESCENA
// ============================================

const scene = new THREE.Scene();

// ============================================
// SISTEMA DE INPUT
// ============================================

const inputManager = new InputManager();

// ============================================
// CAMPO DE ESTRELLAS (fondo animado — parallax)
// ============================================

function createStarField(): THREE.Points {
  const starCount = 300;
  const positions = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * WORLD_WIDTH * 3;
    positions[i * 3 + 1] = (Math.random() - 0.5) * WORLD_HEIGHT * 2;
    positions[i * 3 + 2] = -1 - Math.random() * 5;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: COLOR_STARS,
    size: 0.08,
    transparent: true,
    opacity: 0.5,
    sizeAttenuation: false,
  });

  return new THREE.Points(geometry, material);
}

const stars = createStarField();
scene.add(stars);

// ============================================
// GRID DE FONDO (parallax retro)
// ============================================

function createBackgroundGrid(): THREE.Group {
  const group = new THREE.Group();
  const material = new THREE.LineBasicMaterial({
    color: COLOR_NEON_GREEN,
    transparent: true,
    opacity: 0.04,
  });

  const gridWidth = WORLD_WIDTH * 3;

  for (let y = -WORLD_HEIGHT; y <= WORLD_HEIGHT; y += 2) {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-gridWidth, y, -2),
      new THREE.Vector3(gridWidth, y, -2),
    ]);
    group.add(new THREE.Line(geometry, material));
  }

  for (let x = -gridWidth; x <= gridWidth; x += 2) {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, -WORLD_HEIGHT, -2),
      new THREE.Vector3(x, WORLD_HEIGHT, -2),
    ]);
    group.add(new THREE.Line(geometry, material));
  }

  return group;
}

const grid = createBackgroundGrid();
scene.add(grid);

// ============================================
// BORDE LUMINOSO DE LA PANTALLA
// ============================================

function createScreenBorder(): THREE.LineLoop {
  const hw = WORLD_WIDTH / 2 - 0.2;
  const hh = WORLD_HEIGHT / 2 - 0.2;

  const points = [
    new THREE.Vector3(-hw,  hh, 0),
    new THREE.Vector3( hw,  hh, 0),
    new THREE.Vector3( hw, -hh, 0),
    new THREE.Vector3(-hw, -hh, 0),
  ];

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: COLOR_NEON_GREEN,
    transparent: true,
    opacity: 0.3,
  });

  return new THREE.LineLoop(geometry, material);
}

const border = createScreenBorder();
scene.add(border);

// ============================================
// TERRENO PROCEDURAL
// ============================================

const terrain = new Terrain();
scene.add(terrain.group);

// ============================================
// SISTEMA DE EXPLOSIONES
// ============================================

const explosionManager = new ExplosionManager();
scene.add(explosionManager.group);

// ============================================
// SISTEMA DE ENEMIGOS
// ============================================

const enemyManager = new EnemyManager(terrain);
scene.add(enemyManager.group);

// ============================================
// NAVE DEL JUGADOR
// ============================================

const player = new Player(inputManager);
scene.add(player.mesh);

// ============================================
// SISTEMA DE PROYECTILES
// ============================================

const projectileManager = new ProjectileManager();
scene.add(projectileManager.group);

projectileManager.setTerrain(terrain);
projectileManager.setExplosionManager(explosionManager);

// ============================================
// SISTEMA DE COLISIONES
// ============================================

const collisionManager = new CollisionManager(
  enemyManager,
  projectileManager,
  player,
  explosionManager
);

// ============================================
// UI, AUDIO Y CONTROLES TÁCTILES (Fase 8)
// ============================================

const ui = new UI();
const audioManager = new AudioManager();
const touchControls = new TouchControls();

// ============================================
// ESTADOS DEL JUEGO — Fase 8 añade PAUSED
// ============================================

const GameState = {
  START_MENU: 0,
  PLAYING: 1,
  GAME_OVER: 2,
  EDITOR: 3,
  PAUSED: 4,        // ← Nuevo en Fase 8
} as const;

type GameState = typeof GameState[keyof typeof GameState];

let gameState: GameState = GameState.START_MENU;

// ============================================
// EDITOR DE NIVELES
// ============================================

const levelEditor = new LevelEditor(enemyManager, terrain);
levelEditor.onExit = () => {
  levelEditor.setActive(false);
  ui.showStartMenu();
  gameState = GameState.START_MENU;
};

const btnEnterEditor = document.getElementById('btn-enter-editor');
if (btnEnterEditor) {
  btnEnterEditor.addEventListener('click', () => {
    if (gameState === GameState.START_MENU || gameState === GameState.GAME_OVER) {
      ui.hideMenu();
      levelEditor.setActive(true);
      gameState = GameState.EDITOR;
      playerAlive = false;
      player.mesh.visible = false;
    }
  });
}

// Variables de estado global
export let score = 0;
export let lives = INITIAL_LIVES;

ui.showStartMenu();
ui.updateScore(score);
ui.updateLives(lives);

collisionManager.onScore = (points: number) => {
  score += points;
  ui.updateScore(score);
  audioManager.playExplosion('SMALL');
};

collisionManager.onPlayerHit = () => {
  killPlayer();
};

// ============================================
// FULLSCREEN (Fase 8)
// ============================================

/**
 * Alterna la pantalla completa del documento.
 */
function toggleFullscreen(): void {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
    updateFullscreenIcon(true);
  } else {
    document.exitFullscreen().catch(() => {});
    updateFullscreenIcon(false);
  }
}

function updateFullscreenIcon(isFullscreen: boolean): void {
  const btn = document.getElementById('btn-fullscreen');
  if (btn) btn.innerText = isFullscreen ? '⊡' : '⛶';
}

// Botón de fullscreen en HUD
const btnFullscreen = document.getElementById('btn-fullscreen');
if (btnFullscreen) {
  btnFullscreen.addEventListener('click', () => {
    audioManager.init();
    toggleFullscreen();
  });
}

// Sincronizar icono si el usuario sale del fullscreen con Esc
document.addEventListener('fullscreenchange', () => {
  updateFullscreenIcon(!!document.fullscreenElement);
});

// ============================================
// COLISIÓN NAVE VS TERRENO
// ============================================

let playerAlive = true;
let respawnTimer = 0;
const RESPAWN_DELAY = 2.0;

function checkPlayerTerrainCollision(): boolean {
  if (!playerAlive) return false;

  const pos = player.getPosition();
  const margin = 0.4;

  const floorH   = terrain.getFloorHeightAtWorldX(pos.x);
  const ceilingH = terrain.getCeilingHeightAtWorldX(pos.x);

  return (pos.y - margin <= floorH || pos.y + margin >= ceilingH);
}

function killPlayer(): void {
  if (!playerAlive) return;
  playerAlive = false;
  lives--;
  ui.updateLives(lives);
  audioManager.playExplosion('LARGE');

  if (lives < 0) {
    gameState = GameState.GAME_OVER;
    ui.showGameOver(score);
    audioManager.playGameOver();
    touchControls.setVisible(false);
  } else {
    respawnTimer = RESPAWN_DELAY;
    enemyManager.clear();
  }

  explosionManager.spawn(player.getPosition(), ExplosionSize.LARGE);
  setTimeout(() => {
    explosionManager.spawn(
      player.getPosition().add(new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 1,
        0
      )),
      ExplosionSize.SMALL
    );
  }, 100);

  player.mesh.visible = false;
}

function respawnPlayer(): void {
  playerAlive = true;
  player.mesh.visible = true;
  player.reset();

  let blinkCount = 0;
  const blinkInterval = setInterval(() => {
    player.mesh.visible = !player.mesh.visible;
    blinkCount++;
    if (blinkCount >= 10) {
      player.mesh.visible = true;
      clearInterval(blinkInterval);
    }
  }, 120);
}

// ============================================
// ANIMACIÓN DE FONDO
// ============================================

function animateStars(delta: number): void {
  const positions = stars.geometry.attributes.position.array as Float32Array;
  const starSpeed = SCROLL_SPEED * 0.3;

  for (let i = 0; i < positions.length / 3; i++) {
    positions[i * 3] -= delta * starSpeed;
    if (positions[i * 3] < -WORLD_WIDTH * 1.5) {
      positions[i * 3] = WORLD_WIDTH * 1.5;
      positions[i * 3 + 1] = (Math.random() - 0.5) * WORLD_HEIGHT * 2;
    }
  }

  stars.geometry.attributes.position.needsUpdate = true;
}

function animateGrid(delta: number): void {
  grid.position.x -= SCROLL_SPEED * 0.15 * delta;
  if (grid.position.x < -4) {
    grid.position.x += 2;
  }
}

// ============================================
// INTEGRACIÓN CONTROLES TÁCTILES → PLAYER
// ============================================

/**
 * Aplica el estado del joystick táctil al InputManager
 * sobreescribiendo su estado para el frame actual.
 * Se llama cada frame antes de player.update().
 */
let lastBombTouch = false;  // detección de flanco para bomba

function applyTouchInput(): void {
  const ts = touchControls.state;

  // Override direcciones si hay toque activo
  if (ts.left || ts.right || ts.up || ts.down || ts.fire || ts.bomb) {
    // Simular acciones en el InputManager directamente
    (inputManager as unknown as { actionStates: Map<string, boolean> })
      .actionStates.set(InputAction.UP,    ts.up);
    (inputManager as unknown as { actionStates: Map<string, boolean> })
      .actionStates.set(InputAction.DOWN,  ts.down);
    (inputManager as unknown as { actionStates: Map<string, boolean> })
      .actionStates.set(InputAction.LEFT,  ts.left);
    (inputManager as unknown as { actionStates: Map<string, boolean> })
      .actionStates.set(InputAction.RIGHT, ts.right);
    (inputManager as unknown as { actionStates: Map<string, boolean> })
      .actionStates.set(InputAction.FIRE,  ts.fire);
  }

  // Bomba: disparar al presionar (flanco positivo)
  if (ts.bomb && !lastBombTouch) {
    const pos = player.getBellyPosition();
    projectileManager.fireBomb(pos);
    audioManager.playBomb();
  }
  lastBombTouch = ts.bomb;
}

// ============================================
// MANEJO DE REDIMENSIONAMIENTO
// ============================================

function onWindowResize(): void {
  const newAspect = window.innerWidth / window.innerHeight;
  const newViewWidth = WORLD_HEIGHT * newAspect;

  camera.left   = -newViewWidth / 2;
  camera.right  =  newViewWidth / 2;
  camera.top    =  WORLD_HEIGHT / 2;
  camera.bottom = -WORLD_HEIGHT / 2;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', onWindowResize);

// ============================================
// OCULTAR PANTALLA DE CARGA
// ============================================

setTimeout(() => {
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    loadingScreen.classList.add('hidden');
    setTimeout(() => loadingScreen.remove(), 800);
  }
}, 1500);

// ============================================
// GAME LOOP PRINCIPAL
// ============================================

const clock = new THREE.Clock();

function gameLoop(): void {
  requestAnimationFrame(gameLoop);

  // ── Pantalla de Inicio / Game Over ─────────────────────────
  if (gameState === GameState.START_MENU || gameState === GameState.GAME_OVER) {
    if (inputManager.wasJustPressed(InputAction.START)) {
      audioManager.init();

      score = 0;
      lives = INITIAL_LIVES;
      ui.updateScore(score);
      ui.updateLives(lives);

      playerAlive = true;
      player.mesh.visible = true;
      player.reset();

      enemyManager.clear();
      projectileManager.getActiveProjectiles().forEach(p => p.active = false);

      const customLvl = levelEditor.getLevel();
      if (customLvl.enemies.length > 0) {
        enemyManager.isProcedural = false;
        terrain.setSeed(customLvl.seed);
        levelEditor.refreshEnemies();
      } else {
        enemyManager.isProcedural = true;
      }

      ui.hideMenu();
      touchControls.setVisible(true);
      gameState = GameState.PLAYING;
    }

    if (inputManager.wasJustPressed(InputAction.FULLSCREEN)) {
      toggleFullscreen();
    }

    const delta = Math.min(clock.getDelta(), 0.05);
    terrain.update(delta * 0.2);
    animateStars(delta);
    renderer.render(scene, camera);
    return;
  }

  // ── Editor ──────────────────────────────────────────────────
  if (gameState === GameState.EDITOR) {
    const delta = Math.min(clock.getDelta(), 0.05);
    const speed = SCROLL_SPEED * 2.5;
    if (inputManager.isDown(InputAction.LEFT))  terrain.addScrollOffset(-speed * delta);
    if (inputManager.isDown(InputAction.RIGHT)) terrain.addScrollOffset( speed * delta);

    enemyManager.update(delta, 0);
    animateStars(delta);
    animateGrid(delta);
    renderer.render(scene, camera);
    return;
  }

  // ── Pausa (Fase 8) ──────────────────────────────────────────
  if (gameState === GameState.PAUSED) {
    // Consumir el delta para no acumular tiempo congelado
    clock.getDelta();

    if (inputManager.wasJustPressed(InputAction.PAUSE)) {
      ui.hidePause();
      gameState = GameState.PLAYING;
      // Reiniciar el reloj para que el delta no acumule el tiempo pausado
      clock.start();
    }

    if (inputManager.wasJustPressed(InputAction.FULLSCREEN)) {
      toggleFullscreen();
    }

    // Renderizar escena congelada (sin actualizar nada)
    renderer.render(scene, camera);
    return;
  }

  // ── Juego activo ────────────────────────────────────────────
  const delta = Math.min(clock.getDelta(), 0.05);

  // Tecla de pausa
  if (inputManager.wasJustPressed(InputAction.PAUSE)) {
    gameState = GameState.PAUSED;
    ui.showPause();
    return;
  }

  // Tecla de fullscreen
  if (inputManager.wasJustPressed(InputAction.FULLSCREEN)) {
    toggleFullscreen();
  }

  // Integrar input táctil
  applyTouchInput();

  // Actualizar terreno
  terrain.update(delta);

  // Actualizar jugador
  if (playerAlive) {
    player.update(delta);

    if (checkPlayerTerrainCollision()) {
      killPlayer();
    }
  } else if (lives >= 0) {
    respawnTimer -= delta;
    if (respawnTimer <= 0) {
      respawnPlayer();
    }
  }

  // Actualizar proyectiles y explosiones
  projectileManager.update(delta);
  explosionManager.update(delta);

  // Actualizar enemigos y colisiones
  enemyManager.update(delta, player.getPosition().x);
  collisionManager.update();

  // Efectos de fondo
  animateStars(delta);
  animateGrid(delta);

  // Renderizar escena
  renderer.render(scene, camera);
}

// Iniciar el game loop
gameLoop();

// ============================================
// LOG DE INICIALIZACIÓN
// ============================================
console.log(
  '%c🛸 PENETRATOR-3D — Fase 8: Pulido y Optimización\n' +
  '  [P/Esc] Pausa  |  [F] Fullscreen  |  Joystick táctil móvil',
  'color: #00ff41; font-size: 12px; font-weight: bold; background: #000; padding: 8px;'
);
