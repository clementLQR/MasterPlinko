import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { port: 5173, strictPort: true },
  build: {
    target: 'es2022', chunkSizeWarningLimit: 650,
    // three.js dans son propre fichier : l’application reste légère et la bibliothèque, inchangée
    // d’une version à l’autre du jeu, reste en cache du navigateur.
    rolldownOptions: { output: { advancedChunks: { groups: [{ name: 'three', test: /node_modules[\/]three[\/]/ }] } } },
  },
});
