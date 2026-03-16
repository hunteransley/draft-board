import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { writeFileSync } from 'fs'

function adminSavePlugin() {
  return {
    name: 'admin-save-traits',
    configureServer(server) {
      server.middlewares.use('/__admin/ping', (_req, res) => {
        res.setHeader('Content-Type', 'text/plain');
        res.end('ok');
      });
      server.middlewares.use('/__admin/save-traits', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => {
          try {
            JSON.parse(body); // validate
            writeFileSync('./src/scoutingTraits.json', body, 'utf-8');
            res.setHeader('Content-Type', 'text/plain');
            res.end('ok');
          } catch (e) {
            res.statusCode = 400;
            res.end('invalid json');
          }
        });
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), adminSavePlugin()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        combine: resolve(__dirname, 'combine.html'),
      },
    },
  },
})
