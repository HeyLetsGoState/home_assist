import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        '/api/pihole': {
          target: `http://${env.PIHOLE_HOST || '127.0.0.1:8181'}`,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/pihole/, ''),
        },
        '/api/netdata': {
          target: `http://${env.NETDATA_HOST || '127.0.0.1:19999'}`,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/netdata/, ''),
        },
        '/api/portainer': {
          target: 'http://portainer.home:9000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/portainer/, ''),
        },
        '/api/tautulli': {
          target: 'http://192.168.0.26:8182',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/tautulli/, ''),
        },
      },
    },
  }
})
