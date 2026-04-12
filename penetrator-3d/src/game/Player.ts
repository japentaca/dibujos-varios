/**
 * Player.ts — Clase de la nave del jugador
 * 
 * FASE 2: Controles y movimiento
 * - Movimiento suave con aceleración/desaceleración (lerp)
 * - Restricción dentro de los límites del mundo
 * - Inclinación visual al moverse arriba/abajo
 * - Estela del motor que reacciona al movimiento
 * - Interfaz de disparo de misiles y bombas
 * 
 * Estética wireframe verde neón estilo ZX Spectrum.
 */

import * as THREE from 'three';
import {
  PLAYER_SCALE,
  PLAYER_START_X,
  PLAYER_START_Y,
  PLAYER_SPEED_X,
  PLAYER_SPEED_Y,
  PLAYER_MARGIN,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  COLOR_NEON_GREEN,
  COLOR_BRIGHT_GREEN,
} from '../utils/constants';
import { InputManager, InputAction } from '../utils/InputManager';

export class Player {
  /** Grupo principal que contiene toda la geometría de la nave */
  public mesh: THREE.Group;

  /** Efecto de brillo del motor (para animación) */
  private engineGlow: THREE.Mesh;

  /** Estela del motor (para animación reactiva) */
  private trail: THREE.LineSegments;

  /** Tiempo acumulado para animaciones */
  private time: number = 0;

  /** Velocidad actual (para suavizado) */
  private velocity: THREE.Vector2 = new THREE.Vector2(0, 0);

  /** Inclinación visual actual de la nave (rotación Z) */
  private currentTilt: number = 0;

  /** Referencia al input manager */
  private input: InputManager;

  /** Callback para crear un misil (se asigna desde main.ts) */
  public onFireMissile: (() => void) | null = null;

  /** Callback para crear una bomba (se asigna desde main.ts) */
  public onFireBomb: (() => void) | null = null;

  /** Cooldown de disparo de misil (segundos restantes) */
  private missileCooldown: number = 0;

  /** Cooldown de disparo de bomba */
  private bombCooldown: number = 0;

  /** Tiempo entre disparos de misil */
  private readonly MISSILE_FIRE_RATE = 0.18;

  /** Tiempo entre bombas */
  private readonly BOMB_FIRE_RATE = 0.4;

  /** Factor de suavizado del movimiento (0-1, más bajo = más suave) */
  private readonly SMOOTHING = 8;

  /** Ángulo máximo de inclinación (radianes) */
  private readonly MAX_TILT = 0.35;

  constructor(input: InputManager) {
    this.input = input;
    this.mesh = new THREE.Group();

    // =====================
    // FUSELAJE PRINCIPAL
    // =====================
    const bodyShape = new THREE.Shape();
    bodyShape.moveTo(2.5, 0);
    bodyShape.lineTo(1.0, 0.4);
    bodyShape.lineTo(-1.5, 0.5);
    bodyShape.lineTo(-2.0, 0.3);
    bodyShape.lineTo(-2.0, -0.3);
    bodyShape.lineTo(-1.5, -0.5);
    bodyShape.lineTo(1.0, -0.4);
    bodyShape.closePath();

    const bodyGeometry = new THREE.ShapeGeometry(bodyShape);
    const bodyMaterial = new THREE.MeshBasicMaterial({
      color: COLOR_NEON_GREEN,
      wireframe: true,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.mesh.add(body);

    // =====================
    // CABINA DEL PILOTO
    // =====================
    const cockpitShape = new THREE.Shape();
    cockpitShape.moveTo(1.2, 0);
    cockpitShape.lineTo(0.5, 0.25);
    cockpitShape.lineTo(-0.3, 0.2);
    cockpitShape.lineTo(-0.3, -0.2);
    cockpitShape.lineTo(0.5, -0.25);
    cockpitShape.closePath();

    const cockpitGeometry = new THREE.ShapeGeometry(cockpitShape);
    const cockpitMaterial = new THREE.MeshBasicMaterial({
      color: COLOR_BRIGHT_GREEN,
      transparent: true,
      opacity: 0.3,
    });
    const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
    cockpit.position.z = 0.01;
    this.mesh.add(cockpit);

    // =====================
    // ALAS
    // =====================
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(-0.8, 0.9);
    wingShape.lineTo(-1.5, 0.7);
    wingShape.lineTo(-1.2, 0);
    wingShape.closePath();

    const wingGeometry = new THREE.ShapeGeometry(wingShape);
    const wingMaterial = new THREE.MeshBasicMaterial({
      color: COLOR_NEON_GREEN,
      wireframe: true,
    });

    // Ala superior
    const wingTop = new THREE.Mesh(wingGeometry, wingMaterial);
    wingTop.position.set(-0.5, 0.3, 0);
    this.mesh.add(wingTop);

    // Ala inferior (reflejada)
    const wingBottom = new THREE.Mesh(wingGeometry, wingMaterial.clone());
    wingBottom.scale.y = -1;
    wingBottom.position.set(-0.5, -0.3, 0);
    this.mesh.add(wingBottom);

    // =====================
    // MOTOR (efecto de brillo pulsante)
    // =====================
    const engineGeometry = new THREE.CircleGeometry(0.2, 8);
    const engineMaterial = new THREE.MeshBasicMaterial({
      color: COLOR_BRIGHT_GREEN,
      transparent: true,
      opacity: 0.8,
    });
    this.engineGlow = new THREE.Mesh(engineGeometry, engineMaterial);
    this.engineGlow.position.set(-2.0, 0, 0.02);
    this.mesh.add(this.engineGlow);

    // Estela del motor (líneas reactivas)
    const trailGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-2.0, 0, 0),
      new THREE.Vector3(-3.2, 0.15, 0),
      new THREE.Vector3(-2.0, 0, 0),
      new THREE.Vector3(-3.5, 0, 0),
      new THREE.Vector3(-2.0, 0, 0),
      new THREE.Vector3(-3.2, -0.15, 0),
    ]);
    const trailMaterial = new THREE.LineBasicMaterial({
      color: COLOR_NEON_GREEN,
      transparent: true,
      opacity: 0.5,
    });
    this.trail = new THREE.LineSegments(trailGeometry, trailMaterial);
    this.mesh.add(this.trail);

    // =====================
    // POSICIÓN Y ESCALA INICIAL
    // =====================
    this.mesh.scale.set(PLAYER_SCALE, PLAYER_SCALE, PLAYER_SCALE);
    this.mesh.position.set(PLAYER_START_X, PLAYER_START_Y, 0);
  }

  /**
   * Actualiza la nave: movimiento, animaciones y disparo
   * @param delta - Tiempo transcurrido desde el último frame (segundos)
   */
  public update(delta: number): void {
    this.time += delta;

    // =====================
    // MOVIMIENTO SUAVE
    // =====================
    const dir = this.input.getDirection();
    
    // Velocidad objetivo basada en input
    const targetVelX = dir.x * PLAYER_SPEED_X;
    const targetVelY = dir.y * PLAYER_SPEED_Y;

    // Interpolación suave (lerp) hacia la velocidad objetivo
    const lerpFactor = 1 - Math.exp(-this.SMOOTHING * delta);
    this.velocity.x += (targetVelX - this.velocity.x) * lerpFactor;
    this.velocity.y += (targetVelY - this.velocity.y) * lerpFactor;

    // Aplicar velocidad a la posición
    this.mesh.position.x += this.velocity.x * delta;
    this.mesh.position.y += this.velocity.y * delta;

    // =====================
    // RESTRICCIÓN DE LÍMITES
    // =====================
    const halfW = WORLD_WIDTH / 2;
    const halfH = WORLD_HEIGHT / 2;

    // La nave puede moverse en el tercio izquierdo de la pantalla (como Penetrator original)
    const maxX = halfW * 0.3; // solo hasta el 30% derecho desde el centro
    const minX = -halfW + PLAYER_MARGIN;
    const maxY = halfH - PLAYER_MARGIN;
    const minY = -halfH + PLAYER_MARGIN;

    this.mesh.position.x = Math.max(minX, Math.min(maxX, this.mesh.position.x));
    this.mesh.position.y = Math.max(minY, Math.min(maxY, this.mesh.position.y));

    // Si chocamos con un borde, detener velocidad en esa dirección
    if (this.mesh.position.x <= minX || this.mesh.position.x >= maxX) {
      this.velocity.x = 0;
    }
    if (this.mesh.position.y <= minY || this.mesh.position.y >= maxY) {
      this.velocity.y = 0;
    }

    // =====================
    // INCLINACIÓN VISUAL
    // =====================
    // La nave se inclina en la dirección de movimiento vertical
    const targetTilt = -dir.y * this.MAX_TILT;
    this.currentTilt += (targetTilt - this.currentTilt) * lerpFactor;
    this.mesh.rotation.z = this.currentTilt;

    // =====================
    // ANIMACIÓN DEL MOTOR
    // =====================
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 10);
    const mat = this.engineGlow.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.4 + 0.6 * pulse;

    // Motor más grande cuando la nave se mueve
    const speedFactor = 1 + Math.abs(this.velocity.x) / PLAYER_SPEED_X * 0.5;
    this.engineGlow.scale.set(
      (0.8 + 0.4 * pulse) * speedFactor,
      (0.8 + 0.4 * pulse) * speedFactor,
      1
    );

    // Estela más larga cuando se mueve hacia la derecha
    const trailStretch = 1 + Math.max(0, this.velocity.x) / PLAYER_SPEED_X * 0.8;
    this.trail.scale.x = trailStretch;
    const trailMat = this.trail.material as THREE.LineBasicMaterial;
    trailMat.opacity = 0.3 + 0.5 * (Math.abs(this.velocity.x) / PLAYER_SPEED_X);

    // =====================
    // SISTEMA DE DISPARO
    // =====================
    this.missileCooldown = Math.max(0, this.missileCooldown - delta);
    this.bombCooldown = Math.max(0, this.bombCooldown - delta);

    // Misil hacia adelante (Space — permite mantener presionado)
    if (this.input.isDown(InputAction.FIRE) && this.missileCooldown <= 0) {
      this.missileCooldown = this.MISSILE_FIRE_RATE;
      if (this.onFireMissile) {
        this.onFireMissile();
      }
    }

    // Bomba hacia abajo (Ctrl — pulso único)
    if (this.input.wasJustPressed(InputAction.BOMB) && this.bombCooldown <= 0) {
      this.bombCooldown = this.BOMB_FIRE_RATE;
      if (this.onFireBomb) {
        this.onFireBomb();
      }
    }
  }

  /**
   * Obtiene la posición actual de la nave
   */
  public getPosition(): THREE.Vector3 {
    return this.mesh.position.clone();
  }

  /**
   * Obtiene la punta delantera de la nave (para spawn de misiles)
   */
  public getNosePosition(): THREE.Vector3 {
    const pos = this.mesh.position.clone();
    pos.x += 2.5 * PLAYER_SCALE; // Punta del fuselaje
    return pos;
  }

  /**
   * Obtiene la posición inferior de la nave (para spawn de bombas)
   */
  public getBellyPosition(): THREE.Vector3 {
    const pos = this.mesh.position.clone();
    pos.y -= 0.5 * PLAYER_SCALE; // Bajo el vientre
    return pos;
  }

  /**
   * Resetea la posición y velocidad del jugador (ej. tras morir o reiniciar juego)
   */
  public reset(): void {
    this.mesh.position.set(PLAYER_START_X, PLAYER_START_Y, 0);
    this.velocity.set(0, 0);
    this.currentTilt = 0;
    this.mesh.rotation.z = 0;
  }
}
