/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        'bg-primary': '#0a0a0f',
        'bg-secondary': '#12121a',
        'bg-tertiary': '#1a1a25',
        'bg-elevated': '#222230',

        // Glass effect
        'glass-bg': 'rgba(255, 255, 255, 0.03)',
        'glass-border': 'rgba(255, 255, 255, 0.08)',
        'glass-highlight': 'rgba(255, 255, 255, 0.05)',

        // Text
        'text-primary': '#f5f5f7',
        'text-secondary': '#a1a1aa',
        'text-tertiary': '#52525b',

        // Accent colors - muted
        'accent-blue': '#3b82f6',
        'accent-purple': '#8b5cf6',
        'accent-green': '#22c55e',
        'accent-amber': '#f59e0b',
        'accent-red': '#ef4444',
        'accent-pink': '#ec4899',

        // Glows
        'glow-blue': 'rgba(59, 130, 246, 0.5)',
        'glow-purple': 'rgba(139, 92, 246, 0.5)',
        'glow-green': 'rgba(34, 197, 94, 0.5)',
      },
      animation: {
        'shimmer': 'shimmer 2s linear infinite',
        'gradient-x': 'gradient-x 3s ease infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'dash': 'dash 1s linear infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        'gradient-x': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        dash: {
          to: { strokeDashoffset: '-10' },
        },
        glow: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'glass-gradient': 'linear-gradient(to bottom right, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(139, 92, 246, 0.3)',
        'glow-md': '0 0 20px rgba(139, 92, 246, 0.4)',
        'glow-lg': '0 0 30px rgba(139, 92, 246, 0.5)',
        'glow-green': '0 0 20px rgba(34, 197, 94, 0.4)',
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.4)',
        'glow-amber': '0 0 20px rgba(245, 158, 11, 0.4)',
        'glow-pink': '0 0 20px rgba(236, 72, 153, 0.4)',
      },
    },
  },
  plugins: [],
}
