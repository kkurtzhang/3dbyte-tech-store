import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    __AUTH_TYPE__: JSON.stringify('jwt'),
  },
  server: {
    port: 9000,
    host: '0.0.0.0',
  },
});