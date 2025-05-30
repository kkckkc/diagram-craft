/// <reference types="vitest" />
import { defineConfig, UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'node:path';
import yaml from '@rollup/plugin-yaml';

// https://vitejs.dev/config/
const userConfig: UserConfig = {
  plugins: [react(), yaml()],
  test: {
    fakeTimers: {
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'queueMicrotask']
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: id => {
          if (id.includes('node_modules')) {
            return 'vendor';
          } else if (id.includes('canvas-nodes/')) {
            return 'shapes';
          } else if (id.includes('canvas-drawio/')) {
            return 'drawio';
          } else if (id.includes('sample/')) {
            return 'sample-data';
          } else if (id.includes('query')) {
            return 'query';
          }
        }
      }
    }
  },
  css: {
    modules: {
      exportGlobals: true,
      scopeBehaviour: 'global',
      localsConvention: 'camelCase'
    }
  },
  resolve: {
    alias: {
      '@diagram-craft/query': path.join(__dirname, '../../packages/query/src'),
      '@diagram-craft/canvas': path.join(__dirname, '../../packages/canvas/src'),
      '@diagram-craft/canvas-app': path.join(__dirname, '../../packages/canvas-app/src'),
      '@diagram-craft/canvas-drawio': path.join(__dirname, '../../packages/canvas-drawio/src'),
      '@diagram-craft/canvas-edges': path.join(__dirname, '../../packages/canvas-edges/src'),
      '@diagram-craft/canvas-nodes': path.join(__dirname, '../../packages/canvas-nodes/src'),
      '@diagram-craft/canvas-react': path.join(__dirname, '../../packages/canvas-react/src'),
      '@diagram-craft/geometry': path.join(__dirname, '../../packages/geometry/src'),
      '@diagram-craft/model': path.join(__dirname, '../../packages/model/src'),
      '@diagram-craft/utils': path.join(__dirname, '../../packages/utils/src'),
      '@diagram-craft/app-components': path.join(__dirname, '../../packages/app-components/src')
    }
  }
};
export default defineConfig(({ command, mode, isSsrBuild, isPreview }) => {
  if (command === 'serve') {
    return userConfig;
  } else {
    userConfig.esbuild ??= {
      dropLabels: ['DEBUG']
    };
    return userConfig;
  }
});
