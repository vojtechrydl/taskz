import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#161819',
          raised: '#1E2022',
        },
        border: {
          DEFAULT: '#2A2D30',
        },
        brand: {
          DEFAULT: '#7C3AED',
          hover: '#6D28D9',
          muted: '#7C3AED1A',
        },
      },
    },
  },
  plugins: [],
}
export default config
