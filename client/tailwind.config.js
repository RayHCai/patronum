/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Patient-first color palette
        'patient-primary': '#065f46', // emerald-800
        'patient-success': '#10B981', // emerald-500
        'speaker-you': '#3B82F6', // blue-500
        'speaker-moderator': '#065f46', // emerald-800
        'speaker-agent-1': '#8B5CF6', // violet-500
        'speaker-agent-2': '#EC4899', // pink-500
        'speaker-agent-3': '#F59E0B', // amber-500
      },
      fontSize: {
        // Patient-specific font sizes (larger)
        'patient-heading': '32px',
        'patient-body': '24px',
        'patient-small': '20px',
        'conversation-message': '26px',
      },
      spacing: {
        // Patient-specific spacing
        'button-height': '72px',
        'button-height-secondary': '56px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
