/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'app-bg':           '#0d0d0d',
        'app-sidebar':      '#111111',
        'app-card':         '#1a1a1a',
        'app-input':        '#222222',
        'app-border':       '#2a2a2a',
        'app-accent':       '#06b6d4',   // cyan — primary
        'app-green':        '#22c55e',
        'app-yellow':       '#f59e0b',
        'app-red':          '#ef4444',
        'app-orange':       '#f97316',
        'app-purple':       '#a855f7',
        'app-text':         '#e0e0e0',
        'app-text-muted':   '#555555',
      },
    },
  },
  plugins: [],
}
