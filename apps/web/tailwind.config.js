/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Satoshi', 'system-ui', 'sans-serif'],
        display: ['Clash Display', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        // Deep space backgrounds
        'bg-primary': '#030308',
        'bg-secondary': '#0a0a12',
        'bg-tertiary': '#0f0f1a',
        'bg-elevated': '#141420',
        'bg-card': '#0d0d16',

        // Glass effect - more refined
        'glass-bg': 'rgba(12, 12, 20, 0.7)',
        'glass-border': 'rgba(255, 255, 255, 0.06)',
        'glass-highlight': 'rgba(255, 255, 255, 0.04)',
        'glass-strong': 'rgba(255, 255, 255, 0.1)',

        // Text hierarchy
        'text-primary': '#fafafa',
        'text-secondary': '#94949f',
        'text-tertiary': '#4a4a55',
        'text-muted': '#2a2a35',

        // Electric accent palette
        'accent-cyan': '#00f0ff',
        'accent-blue': '#4d7cff',
        'accent-purple': '#a855f7',
        'accent-green': '#00ff94',
        'accent-amber': '#ffb800',
        'accent-red': '#ff4757',
        'accent-pink': '#ff2d92',
        'accent-orange': '#ff6b35',

        // Node type colors
        'node-trigger': '#00ff94',
        'node-action': '#4d7cff',
        'node-ai': '#a855f7',
        'node-condition': '#ffb800',
        'node-output': '#ff2d92',

        // Semantic
        'success': '#00ff94',
        'error': '#ff4757',
        'warning': '#ffb800',
        'info': '#00f0ff',
      },
      animation: {
        'shimmer': 'shimmer 2.5s ease-in-out infinite',
        'gradient-flow': 'gradient-flow 8s ease infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'float': 'float 4s ease-in-out infinite',
        'scan': 'scan 2s linear infinite',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scale-in 0.2s ease-out',
        'border-flow': 'border-flow 3s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '200% 50%' },
          '100%': { backgroundPosition: '-200% 50%' },
        },
        'gradient-flow': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'pulse-glow': {
          '0%, 100%': {
            boxShadow: '0 0 20px rgba(0, 240, 255, 0.3), inset 0 0 20px rgba(0, 240, 255, 0.05)'
          },
          '50%': {
            boxShadow: '0 0 40px rgba(0, 240, 255, 0.5), inset 0 0 30px rgba(0, 240, 255, 0.1)'
          },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'border-flow': {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'mesh-gradient': 'radial-gradient(at 40% 20%, rgba(0, 240, 255, 0.08) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(168, 85, 247, 0.08) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(0, 255, 148, 0.05) 0px, transparent 50%)',
      },
      boxShadow: {
        'glow-cyan': '0 0 30px rgba(0, 240, 255, 0.4)',
        'glow-purple': '0 0 30px rgba(168, 85, 247, 0.4)',
        'glow-green': '0 0 30px rgba(0, 255, 148, 0.4)',
        'glow-pink': '0 0 30px rgba(255, 45, 146, 0.4)',
        'glow-amber': '0 0 30px rgba(255, 184, 0, 0.4)',
        'inner-glow': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
        'card': '0 4px 24px -4px rgba(0, 0, 0, 0.5)',
        'card-hover': '0 8px 32px -4px rgba(0, 0, 0, 0.6)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
    },
  },
  plugins: [],
}
