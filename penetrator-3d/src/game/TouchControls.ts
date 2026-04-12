/**
 * TouchControls.ts — Controles táctiles virtuales para móviles
 *
 * FASE 8: Soporte móvil
 * - Joystick virtual (zona izquierda) para movimiento
 * - Botones de FIRE y BOMB (zona derecha)
 * - Solo visible en dispositivos táctiles
 */

export interface TouchState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  fire: boolean;
  bomb: boolean;
}

export class TouchControls {
  private container: HTMLElement;
  private joystickBase: HTMLElement;
  private joystickKnob: HTMLElement;
  private btnFire: HTMLElement;
  private btnBomb: HTMLElement;

  /** Estado actual de los controles táctiles */
  public state: TouchState = {
    up: false,
    down: false,
    left: false,
    right: false,
    fire: false,
    bomb: false,
  };

  /** true si hay algún toque activo en el joystick */
  private joystickTouchId: number | null = null;
  private joystickOrigin = { x: 0, y: 0 };

  constructor() {
    this.container = document.getElementById('touch-controls') as HTMLElement;
    this.joystickBase = document.getElementById('joystick-base') as HTMLElement;
    this.joystickKnob = document.getElementById('joystick-knob') as HTMLElement;
    this.btnFire = document.getElementById('btn-touch-fire') as HTMLElement;
    this.btnBomb = document.getElementById('btn-touch-bomb') as HTMLElement;

    // Mostrar solo en pantallas táctiles
    if (window.matchMedia('(pointer: coarse)').matches) {
      this.container.style.display = 'flex';
    }

    this.setupJoystick();
    this.setupButtons();
  }

  /**
   * Configura los eventos táctiles del joystick virtual.
   */
  private setupJoystick(): void {
    const base = this.joystickBase;
    const knob = this.joystickKnob;
    const DEAD_ZONE = 10;   // px de zona muerta
    const MAX_DIST = 40;    // px de radio máximo del knob

    const onStart = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      this.joystickTouchId = touch.identifier;
      const rect = base.getBoundingClientRect();
      this.joystickOrigin.x = rect.left + rect.width / 2;
      this.joystickOrigin.y = rect.top + rect.height / 2;
    };

    const onMove = (e: TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier !== this.joystickTouchId) continue;

        const dx = touch.clientX - this.joystickOrigin.x;
        const dy = touch.clientY - this.joystickOrigin.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const clampedDist = Math.min(dist, MAX_DIST);
        const angle = Math.atan2(dy, dx);

        // Mover el knob visualmente
        knob.style.transform = `translate(${Math.cos(angle) * clampedDist}px, ${Math.sin(angle) * clampedDist}px)`;

        // Actualizar estado de dirección
        this.state.left  = dx < -DEAD_ZONE;
        this.state.right = dx > DEAD_ZONE;
        this.state.up    = dy < -DEAD_ZONE;
        this.state.down  = dy > DEAD_ZONE;
      }
    };

    const onEnd = (e: TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.joystickTouchId) {
          this.joystickTouchId = null;
          knob.style.transform = 'translate(0px, 0px)';
          this.state.left = false;
          this.state.right = false;
          this.state.up = false;
          this.state.down = false;
        }
      }
    };

    base.addEventListener('touchstart', onStart, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd, { passive: false });
    window.addEventListener('touchcancel', onEnd, { passive: false });
  }

  /**
   * Configura los botones táctiles de disparo.
   */
  private setupButtons(): void {
    // Botón FIRE (mantener presionado = ráfaga)
    this.btnFire.addEventListener('touchstart', (e) => { e.preventDefault(); this.state.fire = true; }, { passive: false });
    this.btnFire.addEventListener('touchend',   (e) => { e.preventDefault(); this.state.fire = false; }, { passive: false });
    this.btnFire.addEventListener('touchcancel',(e) => { e.preventDefault(); this.state.fire = false; }, { passive: false });

    // Botón BOMB (pulso único)
    this.btnBomb.addEventListener('touchstart', (e) => { e.preventDefault(); this.state.bomb = true; }, { passive: false });
    this.btnBomb.addEventListener('touchend',   (e) => { e.preventDefault(); this.state.bomb = false; }, { passive: false });
    this.btnBomb.addEventListener('touchcancel',(e) => { e.preventDefault(); this.state.bomb = false; }, { passive: false });
  }

  /**
   * Muestra u oculta los controles táctiles.
   */
  public setVisible(visible: boolean): void {
    if (window.matchMedia('(pointer: coarse)').matches) {
      this.container.style.display = visible ? 'flex' : 'none';
    }
  }
}
