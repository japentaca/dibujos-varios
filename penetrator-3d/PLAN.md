# Penetrator-3D — Plan de Desarrollo

> Clon fiel del juego clásico **Penetrator** (ZX Spectrum 1982) usando **Three.js + Vite + TypeScript**.
> Estética **retro cyberpunk verde/neón** como el original.

---

## Reglas del Agente

- Responder **solo con la fase** que se pida (una a la vez).
- Usar **TypeScript** (archivos `.ts`), código **comentado en español**.
- Three.js r134+ importado con Vite.
- Estilo visual **retro verde neón / wireframe / CRT**.
- Al completar cada fase, preguntar:
  `¿Quieres que pase a la siguiente fase? Di exactamente: "Fase X+1"`

---

## Estado de las Fases

| Fase | Nombre                        | Estado | Entregable principal |
|------|-------------------------------|--------|----------------------|
| 1    | Setup básico                  | ✅ COMPLETADA | Proyecto Vite + Three.js + escena ortográfica + nave estática |
| 2    | Controles y movimiento        | ✅ COMPLETADA | Teclado WASD/flechas, movimiento suave, disparo de misiles/bombas |
| 3    | Terreno procedural            | ✅ COMPLETADA | Scroll infinito + generación procedural de montañas y cavernas |
| 4    | Armas y proyectiles           | ✅ COMPLETADA | Misiles adelante + bombas abajo + partículas de explosión |
| 5    | Enemigos y colisiones         | ✅ COMPLETADA | Radares, misiles enemigos, colisiones, vidas, destrucción |
| 6    | UI / HUD / Sonido             | ✅ COMPLETADA | Score, lives, high-score, menú inicio, game over, sonidos retro |
| 7    | Editor de niveles             | ✅ COMPLETADA | Editor drag & drop para crear niveles |
| 8    | Pulido y optimización         | ✅ COMPLETADA | Fullscreen, mobile joystick, pausa, efectos CRT, responsive |

---

## Estructura del Proyecto

```
penetrator-3d/
├── index.html              ← HTML con efectos CRT (scanlines + viñeta)
├── vite.config.ts
├── tsconfig.json
├── package.json            ← three + @types/three
├── PLAN.md                 ← ESTE ARCHIVO (tracking del plan)
├── src/
│   ├── main.ts             ← Game loop, escena, cámara, integración de sistemas
│   ├── game/
│   │   ├── Player.ts       ← Nave wireframe + movimiento suave + disparo
│   │   ├── Terrain.ts      ← Terreno procedural con ruido FBM propio
│   │   ├── Enemy.ts        ← [placeholder — Fase 5]
│   │   ├── Projectile.ts   ← Misiles horizontales + bombas con gravedad
│   │   ├── CollisionManager.ts ← [placeholder — Fase 5]
│   │   ├── UI.ts           ← [placeholder — Fase 6]
│   │   └── AudioManager.ts ← [placeholder — Fase 6]
│   └── utils/
│       ├── constants.ts    ← Todas las constantes del juego centralizadas
│       └── InputManager.ts ← Sistema de input WASD/flechas/Space/Ctrl
└── public/
    └── sounds/             ← [vacío — Fase 6]
```

---

## Detalles de las Fases Completadas

### Fase 1 — Setup básico ✅
- Proyecto Vite + vanilla-ts
- Three.js (r183+) + @types/three
- `index.html` con efectos CRT: scanlines via CSS, viñeta radial, fuente Press Start 2P
- Pantalla de carga animada con fade-out
- Cámara ortográfica (`WORLD_WIDTH=40`, `WORLD_HEIGHT=22.5`)
- Nave del jugador wireframe verde neón (fuselaje, cabina, alas, motor pulsante, estela)
- Campo de 200+ estrellas con parallax
- Grid de fondo retro vectorial
- Borde luminoso verde del área de juego
- Game loop con requestAnimationFrame + THREE.Clock

### Fase 2 — Controles y movimiento ✅
- `InputManager.ts`: mapa de teclas → acciones, estados booleanos por frame
  - WASD + flechas = movimiento
  - Space = misil (mantener = ráfaga con cooldown 0.18s)
  - Ctrl = bomba (pulso único con cooldown 0.4s)
  - Normalización diagonal para velocidad uniforme
  - preventDefault en flechas/espacio para evitar scroll
- `Player.ts` actualizado:
  - Movimiento suave con lerp exponencial (factor=8)
  - Restricción de límites (nave en tercio izquierdo de pantalla)
  - Inclinación visual (rotación Z) al moverse vertical
  - Motor reactivo a velocidad (tamaño + opacidad)
  - Estela que se estira al moverse
  - Callbacks `onFireMissile` / `onFireBomb`
- `Projectile.ts` (ProjectileManager):
  - Misiles: vuelo horizontal a 25 u/s, punta triangular, estela, motor parpadeante
  - Bombas: diagonal adelante-abajo con gravedad 18 u/s², rotación al caer
  - Partículas de destello amarillo al disparar
  - Pool de proyectiles con limpieza de geometría (dispose)
  - Máximo 30 proyectiles simultáneos
  - Eliminación automática fuera de pantalla

### Fase 3 — Terreno procedural ✅
- `Terrain.ts` (reescrito):
  - Clase `SimpleNoise`: ruido pseudo-aleatorio 1D con smoothstep + FBM de 4 octavas
  - Dos generadores con semillas distintas (suelo=42, techo=137)
  - Frecuencia principal `0.06` + detalle fino `0.15`
  - Suelo: `FLOOR_BASE = -altura/2 + 3`, amplitud 4.0
  - Techo: `CEILING_BASE = +altura/2 - 3`, amplitud 4.0
  - Gap mínimo garantizado = 5.0 unidades
  - Estrategia de render: recalcular posiciones de vértices cada frame en coords de pantalla
  - Borde brillante (opacidad 0.9) + relleno sólido verde oscuro (opacidad 0.25)
  - 5 líneas de textura interna proporcionales al perfil
  - Métodos `getFloorHeightAtWorldX()` / `getCeilingHeightAtWorldX()` para colisiones
- `constants.ts`: +15 constantes de terreno
- `main.ts`: integración del terreno, parallax de estrellas (30% velocidad) y grid (15% velocidad)

---

### Fase 4 — Armas y proyectiles ✅
- `ExplosionManager.ts`:
  - Partículas de explosión con destello, anillo expansivo (shockwave) y fragmentos (chispas) con gravedad.
  - Dos tamaños de explosión: pequeña (misil) y grande (bomba o muerte del jugador).
- `Projectile.ts` modificado:
  - Detección de impacto contra las alturas del suelo y del techo proporcionadas por el terreno.
  - Conexión con `ExplosionManager` para disparar partículas en el punto de colisión.
- `main.ts` actualizado:
  - Sistema de muerte del jugador y respawn.
  - La nave explota al impactar contra el terreno.
  - Reaparición tras 2s con animación de parpadeo temporal.

---

### Fase 5 — Enemigos y colisiones ✅
- `EnemyManager` y procedural random spawns de enemigos:
  - Radares (estáticos) en el suelo o techo.
  - Misiles enemigos (estáticos en el suelo que despegan hacia arriba al acercarte).
- `CollisionManager` para distancias (círculos):
  - Bala vs Enemigo (destrucción + puntuación + explosión pequeña).
  - Jugador vs Enemigo (muerte del jugador + explosión).

### Fase 6 — UI / HUD / Sonido ✅
- `UI.ts` con HTML overlays (`#ui-layer`) encima del Canvas.
  - Puntuación (`SCORE: 000000`) y Vidas numéricas/iconos (`LIVES: ♥ ♥ ♥`).
  - Menú de Inicio (START_MENU).
  - Pantalla de GAME OVER.
- `AudioManager.ts` (Web Audio API):
  - Sintetizador integrado en el código, sin assets externos. No necesita librerías extra.
  - Sonidos de disparo de misil, caída de bomba, explosiones y música/tono de Game Over.
- Integración en `main.ts` con la Máquina de Estados:
  - `GameState.START_MENU`, `GameState.PLAYING`, `GameState.GAME_OVER`.
  - Acción 'Enter' en `InputManager` agregada.

---

### Fase 7 — Editor de niveles ✅
- Botón "LEVEL EDITOR" añadido al menú inicial.
- Capa HTML dedicada al editor visible únicamente en `GameState.EDITOR`.
- Funcionalidad **Drag & Drop**: se pueden arrastrar botones de Radar y Misil desde el sidebar hacia el Canvas.
- Posicionamiento exacto (`handleDrop` calcula Coordenadas Normalizadas del dispositivo al Espacio Ortográfico Global vinculando el `scrollOffset` actual).
- Generación Estática (`enemyManager.isProcedural = false`):
  - Previene que el mapa cambie o cree enemigos aleatoriamente.
  - El propio juego evalúa si hay un nivel cargado (con enemigos); de ser así deshabilita procedural generation y bloquea la `seed`.
- Desplazamiento por el mapa mediante flechas izquierda y derecha (`A/D` o flechas).
- Controles SAVE / LOAD: Exportación a Clipboard y lectura mediante un `prompt` de texto guardando la estructura `LevelData` en formato JSON puro.

---

### Fase 8 — Pulido y optimización ✅
- **Pausa** (`GameState.PAUSED`): tecla `P` o `Escape` congela el game loop (consumiendo delta sin actualizar) y muestra pantalla de pausa con efecto pulsante. Reanudar con `P`/`Esc`.
- **Fullscreen**: tecla `F` o botón `⛶` en el HUD llaman a `document.documentElement.requestFullscreen()`. El icono se actualiza con `fullscreenchange`.
- **Soporte Móvil** (`TouchControls.ts`):
  - Joystick virtual (izquierda, radio 40px, dead zone 10px).
  - Botones FIRE y BOMB circulares (derecha) con feedback visual al pulsar.
  - Solo aparece si `pointer: coarse` (dispositivo táctil).
  - Integración en `main.ts` mediante `applyTouchInput()` cada frame.
- **Efectos CRT mejorados**: animación `crtFlicker` en scanlines, viñeta más profunda, filtro contrast/brightness en el canvas.
- **Responsive UI**: todos los tamaños de fuente y padding usan `clamp()` para adaptarse a pantallas pequeñas.
- **Barra de carga animada**: barra de progreso decorativa en la pantalla de loading.
- **Hints de teclas** en el menú de inicio.
- **Performance**: delta capped a 50ms, `clock.start()` al reanudar pausa para evitar acumulación de tiempo.

---

## Dependencias instaladas
- `three` (^0.183.2)
- `@types/three` (^0.183.1)
- `typescript` (~6.0.2)
- `vite` (^8.0.4)

## Cómo ejecutar
```bash
cd penetrator-3d
npm install
npm run dev
# Abre http://localhost:5173/
```
