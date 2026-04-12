import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      boxShadow: {
        glowRed: '0 0 35px rgba(239, 68, 68, 0.35)',
        glowBlue: '0 0 35px rgba(59, 130, 246, 0.35)',
        glowGreen: '0 0 35px rgba(34, 197, 94, 0.35)',
        glowCyan: '0 0 35px rgba(34, 211, 238, 0.28)'
      },
      backgroundImage: {
        grid: 'linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)'
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        pulseSlow: 'pulseSlow 4s ease-in-out infinite',
        shimmer: 'shimmer 2.75s linear infinite'
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        pulseSlow: {
          '0%, 100%': { opacity: '0.7' },
          '50%': { opacity: '1' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        }
      }
    }
  },
  plugins: []
};

export default config;