import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, process.cwd(), '')
  const publishableKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    fileEnv.VITE_SUPABASE_PUBLISHABLE_KEY

  if (!publishableKey?.startsWith('sb_publishable_')) {
    throw new Error(
      'VITE_SUPABASE_PUBLISHABLE_KEY must use a modern sb_publishable_... key. ' +
      'Legacy anon JWT keys are not supported.',
    )
  }

  return {
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
  }
})
