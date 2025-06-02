/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // liveprompt.ai Application Colors
        app: {
          primary: "hsl(var(--app-primary))",
          'primary-dark': "hsl(var(--app-primary-dark))",
          'primary-light': "hsl(var(--app-primary-light))",
          success: "hsl(var(--app-success))",
          'success-light': "hsl(var(--app-success-light))",
          warning: "hsl(var(--app-warning))",
          'warning-light': "hsl(var(--app-warning-light))",
          error: "hsl(var(--app-error))",
          'error-light': "hsl(var(--app-error-light))",
          info: "hsl(var(--app-info))",
          'info-light': "hsl(var(--app-info-light))",
        },
        // Guidance Colors
        guidance: {
          ask: "hsl(var(--guidance-ask))",
          'ask-bg': "hsl(var(--guidance-ask-bg))",
          clarify: "hsl(var(--guidance-clarify))",
          'clarify-bg': "hsl(var(--guidance-clarify-bg))",
          suggest: "hsl(var(--guidance-suggest))",
          'suggest-bg': "hsl(var(--guidance-suggest-bg))",
          avoid: "hsl(var(--guidance-avoid))",
          'avoid-bg': "hsl(var(--guidance-avoid-bg))",
          warn: "hsl(var(--guidance-warn))",
          'warn-bg': "hsl(var(--guidance-warn-bg))",
        },
        // Recording States
        recording: {
          active: "hsl(var(--recording-active))",
          paused: "hsl(var(--recording-paused))",
          stopped: "hsl(var(--recording-stopped))",
          ready: "hsl(var(--recording-ready))",
        },
        // Sidebar & Navigation
        sidebar: {
          bg: "hsl(var(--sidebar-bg))",
          border: "hsl(var(--sidebar-border))",
        },
        nav: {
          'item-hover': "hsl(var(--nav-item-hover))",
          'item-active': "hsl(var(--nav-item-active))",
        },
        // Timeline Colors
        timeline: {
          milestone: "hsl(var(--timeline-milestone))",
          'milestone-bg': "hsl(var(--timeline-milestone-bg))",
          decision: "hsl(var(--timeline-decision))",
          'decision-bg': "hsl(var(--timeline-decision-bg))",
          action: "hsl(var(--timeline-action))",
          'action-bg': "hsl(var(--timeline-action-bg))",
          question: "hsl(var(--timeline-question))",
          'question-bg': "hsl(var(--timeline-question-bg))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'pulse-ring': 'pulseRing 1.25s cubic-bezier(0.215, 0.61, 0.355, 1) infinite',
        'recording-pulse': 'recordingPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'guidance-enter': 'guidanceEnter 0.3s ease-out',
      },
      keyframes: {
        fadeInUp: {
          '0%': {
            opacity: '0',
            transform: 'translateY(30px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        pulseRing: {
          '0%': {
            transform: 'scale(0.33)',
          },
          '40%, 50%': {
            opacity: '1',
          },
          '100%': {
            opacity: '0',
            transform: 'scale(1.33)',
          },
        },
        recordingPulse: {
          '0%, 100%': {
            opacity: '1',
          },
          '50%': {
            opacity: '0.5',
          },
        },
        guidanceEnter: {
          'from': {
            opacity: '0',
            transform: 'translateY(10px) scale(0.95)',
          },
          'to': {
            opacity: '1',
            transform: 'translateY(0) scale(1)',
          },
        },
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography")
  ],
} 