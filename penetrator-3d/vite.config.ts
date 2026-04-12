import { defineConfig } from 'vite';

/**
 * Configuración de Vite para Penetrator-3D
 * - Servidor de desarrollo en el puerto 5173
 * - Soporte para TypeScript + Three.js
 */
export default defineConfig({
  server: {
    port: 5173,
    open: true,
  },
  build: {
    target: 'esnext',
    sourcemap: true,
  },
});
