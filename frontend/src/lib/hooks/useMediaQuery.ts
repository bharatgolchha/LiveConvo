import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    
    // Set initial value
    setMatches(media.matches);

    // Create event listener
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Add event listener
    if (media.addListener) {
      media.addListener(listener);
    } else {
      media.addEventListener('change', listener);
    }

    // Clean up
    return () => {
      if (media.removeListener) {
        media.removeListener(listener);
      } else {
        media.removeEventListener('change', listener);
      }
    };
  }, [query]);

  return matches;
}

// Predefined breakpoints matching Tailwind's defaults
export const breakpoints = {
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  xl: '(min-width: 1280px)',
  '2xl': '(min-width: 1536px)',
} as const;

// Convenience hooks for common breakpoints
export function useIsMobile() {
  return !useMediaQuery(breakpoints.md);
}

export function useIsTablet() {
  const isAboveMobile = useMediaQuery(breakpoints.md);
  const isDesktop = useMediaQuery(breakpoints.lg);
  return isAboveMobile && !isDesktop;
}

export function useIsDesktop() {
  return useMediaQuery(breakpoints.lg);
}