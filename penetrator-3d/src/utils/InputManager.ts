/**
 * InputManager.ts — Sistema centralizado de entrada por teclado
 * 
 * Gestiona el estado de las teclas presionadas en cada frame.
 * Soporta WASD + flechas + barra espaciadora + tecla Ctrl.
 * 
 * Diseño: patrón singleton con mapa de estados booleano.
 * Se consulta desde el game loop para movimiento suave (no basado en eventos).
 */

/** Acciones posibles del jugador */
export const InputAction = {
  UP: 'UP',
  DOWN: 'DOWN',
  LEFT: 'LEFT',
  RIGHT: 'RIGHT',
  FIRE: 'FIRE',        // Misil hacia adelante
  BOMB: 'BOMB',        // Bomba hacia abajo
  START: 'START',      // Iniciar o reiniciar juego (Enter)
  PAUSE: 'PAUSE',      // Pausa (P / Escape)
  FULLSCREEN: 'FULLSCREEN', // Pantalla completa (F)
} as const;

export type InputAction = typeof InputAction[keyof typeof InputAction];

/**
 * Mapa de teclas físicas → acciones del juego.
 * Incluye WASD, flechas y teclas de disparo.
 */
const KEY_MAP: Record<string, InputAction> = {
  // Movimiento con WASD
  'KeyW': InputAction.UP,
  'KeyA': InputAction.LEFT,
  'KeyS': InputAction.DOWN,
  'KeyD': InputAction.RIGHT,
  
  // Movimiento con flechas
  'ArrowUp': InputAction.UP,
  'ArrowLeft': InputAction.LEFT,
  'ArrowDown': InputAction.DOWN,
  'ArrowRight': InputAction.RIGHT,
  
  'Space': InputAction.FIRE,
  'ControlLeft': InputAction.BOMB,
  'ControlRight': InputAction.BOMB,
  
  // Menú
  'Enter': InputAction.START,

  // Pausa y pantalla completa
  'KeyP': InputAction.PAUSE,
  'Escape': InputAction.PAUSE,
  'KeyF': InputAction.FULLSCREEN,
};

export class InputManager {
  /** Estado actual de cada acción (true = presionada) */
  private actionStates: Map<InputAction, boolean> = new Map();

  /** Acciones que se activaron este frame (para pulsos únicos como disparar) */
  private justPressed: Map<InputAction, boolean> = new Map();

  /** Acciones procesadas (para evitar repetición de pulsos) */
  private processed: Map<InputAction, boolean> = new Map();

  constructor() {
    // Inicializar todos los estados en false
    for (const action of Object.values(InputAction)) {
      this.actionStates.set(action, false);
      this.justPressed.set(action, false);
      this.processed.set(action, false);
    }

    // Registrar listeners del teclado
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));

    // Evitar que las flechas y espacio hagan scroll en la página
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
    });
  }

  /**
   * Maneja el evento de tecla presionada
   */
  private onKeyDown(event: KeyboardEvent): void {
    const action = KEY_MAP[event.code];
    if (action !== undefined) {
      const wasDown = this.actionStates.get(action)!;
      this.actionStates.set(action, true);

      // Marcar como "recién presionada" solo si no estaba presionada antes
      if (!wasDown) {
        this.justPressed.set(action, true);
        this.processed.set(action, false);
      }
    }
  }

  /**
   * Maneja el evento de tecla liberada
   */
  private onKeyUp(event: KeyboardEvent): void {
    const action = KEY_MAP[event.code];
    if (action !== undefined) {
      this.actionStates.set(action, false);
      this.justPressed.set(action, false);
      this.processed.set(action, false);
    }
  }

  /**
   * Consulta si una acción está activamente presionada (para movimiento continuo)
   */
  public isDown(action: InputAction): boolean {
    return this.actionStates.get(action) ?? false;
  }

  /**
   * Consulta si una acción se acaba de presionar este frame (para disparo único).
   * Devuelve true solo una vez por pulsación.
   */
  public wasJustPressed(action: InputAction): boolean {
    if (this.justPressed.get(action) && !this.processed.get(action)) {
      this.processed.set(action, true);
      return true;
    }
    return false;
  }

  /**
   * Obtiene el vector de dirección normalizado basado en las teclas presionadas.
   * Retorna {x, y} donde cada componente está entre -1 y 1.
   */
  public getDirection(): { x: number; y: number } {
    let x = 0;
    let y = 0;

    if (this.isDown(InputAction.LEFT)) x -= 1;
    if (this.isDown(InputAction.RIGHT)) x += 1;
    if (this.isDown(InputAction.UP)) y += 1;
    if (this.isDown(InputAction.DOWN)) y -= 1;

    // Normalizar diagonal para evitar que vaya más rápido
    const length = Math.sqrt(x * x + y * y);
    if (length > 0) {
      x /= length;
      y /= length;
    }

    return { x, y };
  }

  /**
   * Limpia recursos (eliminar listeners)
   */
  public dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }
}
