export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          light: '#FBFBFA', 
          dark: '#1a1a1a',  
        },
        surface: {
          light: '#F3F2EF', 
          dark: '#242424',
          hoverLight: '#E8E7E4',
          hoverDark: '#2a2a2a',
        },
        text: {
          primaryLight: '#1a1a1a',
          secondaryLight: '#666666',
          primaryDark: '#e5e5e5',
          secondaryDark: '#a3a3a3',
        },
        border: {
          light: '#e5e5e5',
          dark: '#333333',
        },
        primary: {
          DEFAULT: '#d97757', 
          hover: '#c46b4e',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Merriweather', 'serif'],
      },
      boxShadow: {
        'input': '0 2px 10px rgba(0, 0, 0, 0.05)',
        'input-focus': '0 4px 20px rgba(0, 0, 0, 0.08)',
      }
    },
  },
  plugins: [],
}
