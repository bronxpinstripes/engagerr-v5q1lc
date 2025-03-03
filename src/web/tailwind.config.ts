import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';
import plugin from 'tailwindcss/plugin';

/**
 * Helper function to create a color object with various shade levels
 * @param baseColor The main color value
 * @param shades Optional overrides for specific shades
 * @returns Object with color shades from 50 to 950
 */
const createColorObject = (
  baseColor: string,
  shades: Record<string, string> = {}
): Record<string, string> => {
  // Default color object with the base color as DEFAULT
  const colorObj: Record<string, string> = {
    DEFAULT: baseColor,
    ...shades,
  };

  return colorObj;
};

// Custom animation plugin
const customAnimationPlugin = plugin(({ addUtilities, theme }) => {
  const animationUtilities = {
    '.fade-in': {
      animation: `${theme('animation.fadeIn')}`,
    },
    '.slide-in': {
      animation: `${theme('animation.slideIn')}`,
    },
    '.spin-slow': {
      animation: `${theme('animation.spin-slow')}`,
    },
    '.pulse-slow': {
      animation: `${theme('animation.pulse-slow')}`,
    },
    '.focus-visible': {
      outline: `2px solid ${theme('colors.primary.600')}`,
      outlineOffset: '2px',
    },
  };

  addUtilities(animationUtilities);
});

const config: Config = {
  content: [
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/app/**/*.{js,ts,jsx,tsx}',
    './src/lib/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    colors: {
      primary: {
        DEFAULT: '#2563EB', // Deep Blue
        '50': '#EFF6FF',
        '100': '#DBEAFE',
        '200': '#BFDBFE',
        '300': '#93C5FD',
        '400': '#60A5FA',
        '500': '#3B82F6',
        '600': '#2563EB',
        '700': '#1D4ED8',
        '800': '#1E40AF',
        '900': '#1E3A8A',
        '950': '#172554',
      },
      secondary: {
        DEFAULT: '#0D9488', // Teal
        '50': '#F0FDFA',
        '100': '#CCFBF1',
        '200': '#99F6E4',
        '300': '#5EEAD4',
        '400': '#2DD4BF',
        '500': '#14B8A6',
        '600': '#0D9488',
        '700': '#0F766E',
        '800': '#115E59',
        '900': '#134E4A',
        '950': '#042F2E',
      },
      accent: {
        DEFAULT: '#8B5CF6', // Purple
        '50': '#F5F3FF',
        '100': '#EDE9FE',
        '200': '#DDD6FE',
        '300': '#C4B5FD',
        '400': '#A78BFA',
        '500': '#8B5CF6',
        '600': '#7C3AED',
        '700': '#6D28D9',
        '800': '#5B21B6',
        '900': '#4C1D95',
        '950': '#2E1065',
      },
      background: '#F9FAFB',
      foreground: '#1F2937',
      error: '#EF4444', // Red
      warning: '#F59E0B', // Yellow
      success: '#10B981', // Green
      muted: {
        DEFAULT: '#F1F5F9',
        foreground: '#64748B',
      },
      card: {
        DEFAULT: '#FFFFFF',
        foreground: '#1F2937',
      },
      popover: {
        DEFAULT: '#FFFFFF',
        foreground: '#1F2937',
      },
      border: '#E5E7EB',
    },
    fontFamily: {
      sans: ['Inter', ...defaultTheme.fontFamily.sans],
      mono: ['JetBrains Mono', ...defaultTheme.fontFamily.mono],
    },
    fontSize: {
      'xs': ['0.75rem', { lineHeight: '1rem' }],
      'sm': ['0.875rem', { lineHeight: '1.25rem' }],
      'base': ['1rem', { lineHeight: '1.5rem' }],
      'lg': ['1.125rem', { lineHeight: '1.75rem' }],
      'xl': ['1.25rem', { lineHeight: '1.75rem' }],
      '2xl': ['1.5rem', { lineHeight: '2rem' }],
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      '5xl': ['3rem', { lineHeight: '1' }],
      '6xl': ['3.75rem', { lineHeight: '1' }],
    },
    borderRadius: {
      'none': '0',
      'sm': '0.125rem',
      DEFAULT: '0.25rem',
      'md': '0.375rem',
      'lg': '0.5rem',
      'xl': '0.75rem',
      '2xl': '1rem',
      'full': '9999px',
    },
    boxShadow: {
      'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
      'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
      'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
      'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
      'none': 'none',
    },
    spacing: {
      'px': '1px',
      '0': '0',
      '0.5': '0.125rem',
      '1': '0.25rem',
      '1.5': '0.375rem',
      '2': '0.5rem',
      '2.5': '0.625rem',
      '3': '0.75rem',
      '3.5': '0.875rem',
      '4': '1rem',
      '5': '1.25rem',
      '6': '1.5rem',
      '7': '1.75rem',
      '8': '2rem',
      '9': '2.25rem',
      '10': '2.5rem',
      '11': '2.75rem',
      '12': '3rem',
      '14': '3.5rem',
      '16': '4rem',
      '20': '5rem',
      '24': '6rem',
      '28': '7rem',
      '32': '8rem',
      '36': '9rem',
      '40': '10rem',
      '44': '11rem',
      '48': '12rem',
      '52': '13rem',
      '56': '14rem',
      '60': '15rem',
      '64': '16rem',
      '72': '18rem',
      '80': '20rem',
      '96': '24rem',
    },
    screens: {
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      animation: {
        'fadeIn': 'fadeIn 0.3s ease-in-out',
        'slideIn': 'slideIn 0.3s ease-in-out',
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      typography: {
        DEFAULT: {
          css: {
            color: '#1F2937',
            a: {
              color: '#2563EB',
              textDecoration: 'underline',
              fontWeight: '500',
            },
            'h1, h2, h3, h4, h5, h6': {
              fontWeight: '600',
              color: '#1F2937',
            },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms')({
      strategy: 'class',
    }),
    require('@tailwindcss/aspect-ratio'),
    require('@tailwindcss/container-queries'),
    customAnimationPlugin,
  ],
};

export default config;