/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'SF Pro Text', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: '#07111f',
        mist: '#eef6ff',
        aqua: '#7dd3fc',
        iris: '#a78bfa',
        blush: '#f9a8d4',
        mint: '#86efac',
        glass: {
          DEFAULT: 'rgba(255, 255, 255, 0.08)',
          soft: 'rgba(255, 255, 255, 0.14)',
          stroke: 'rgba(255, 255, 255, 0.2)',
          deep: 'rgba(7, 17, 31, 0.72)',
        },
      },
      backdropBlur: {
        xs: '2px',
        glass: '20px',
        liquid: '28px',
      },
      boxShadow: {
        glass:
          '0 12px 40px rgba(7, 17, 31, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
        'glass-lg':
          '0 24px 80px rgba(7, 17, 31, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.24)',
      },
      backgroundImage: {
        'mesh-gradient':
          'radial-gradient(circle at 20% 20%, rgba(125, 211, 252, 0.35), transparent 0 28%), radial-gradient(circle at 80% 0%, rgba(167, 139, 250, 0.28), transparent 0 30%), radial-gradient(circle at 50% 80%, rgba(249, 168, 212, 0.24), transparent 0 32%), linear-gradient(135deg, #07111f 0%, #0d1728 45%, #111c30 100%)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        aurora: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1)' },
          '50%': { transform: 'translate3d(3%, -2%, 0) scale(1.06)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '0.7' },
          '50%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        aurora: 'aurora 18s ease-in-out infinite alternate',
        'pulse-soft': 'pulse-soft 4s ease-in-out infinite',
        shimmer: 'shimmer 3s linear infinite',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}
