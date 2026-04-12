/**
 * UI.ts — Gestor del menú y HUD
 *
 * FASE 8: Pulido y optimización
 * - Pantalla de PAUSA
 * - Botón de Fullscreen en el HUD
 * - Métodos para los controles táctiles
 */

export class UI {
  private elScore: HTMLElement;
  private elLives: HTMLElement;
  private elMenu: HTMLElement;
  private elMenuTitle: HTMLElement;
  private elMenuSubtitle: HTMLElement;
  private hudTop: HTMLElement;
  private elPauseScreen: HTMLElement;

  constructor() {
    this.elScore = document.getElementById('ui-score') as HTMLElement;
    this.elLives = document.getElementById('ui-lives') as HTMLElement;
    this.elMenu = document.getElementById('ui-menu') as HTMLElement;
    this.elMenuTitle = document.getElementById('ui-menu-title') as HTMLElement;
    this.elMenuSubtitle = document.getElementById('ui-menu-subtitle') as HTMLElement;
    this.hudTop = document.getElementById('hud-top') as HTMLElement;
    this.elPauseScreen = document.getElementById('ui-pause') as HTMLElement;
  }

  public updateScore(score: number): void {
    if (this.elScore) {
      this.elScore.innerText = `SCORE: ${score.toString().padStart(6, '0')}`;
    }
  }

  public updateLives(lives: number): void {
    if (this.elLives) {
      const hearts = lives > 0 ? '♥ '.repeat(lives) : '';
      this.elLives.innerText = `LIVES: ${hearts}`;
    }
  }

  public showStartMenu(): void {
    if (this.elMenu) this.elMenu.classList.remove('hidden');
    if (this.hudTop) this.hudTop.classList.add('hidden');
    if (this.elMenuTitle) this.elMenuTitle.innerText = 'PENETRATOR 3D';
    if (this.elMenuSubtitle) this.elMenuSubtitle.innerText = 'PRESS ENTER TO START';
    this.hidePause();
  }

  public showGameOver(score: number): void {
    if (this.elMenu) this.elMenu.classList.remove('hidden');
    if (this.hudTop) this.hudTop.classList.remove('hidden');
    if (this.elMenuTitle) this.elMenuTitle.innerText = 'GAME OVER';
    if (this.elMenuSubtitle) {
      this.elMenuSubtitle.innerText = `FINAL SCORE: ${score}\n\nPRESS ENTER TO RESTART`;
    }
    this.hidePause();
  }

  public hideMenu(): void {
    if (this.elMenu) this.elMenu.classList.add('hidden');
    if (this.hudTop) this.hudTop.classList.remove('hidden');
  }

  // ——— Pausa ———

  public showPause(): void {
    if (this.elPauseScreen) this.elPauseScreen.classList.remove('hidden');
  }

  public hidePause(): void {
    if (this.elPauseScreen) this.elPauseScreen.classList.add('hidden');
  }
}
