import { useEffect, useState, useRef } from 'react';

export function useOnScreen<T extends Element>(options: IntersectionObserverInit = { root: null, rootMargin: '0px', threshold: 0.1 }) {
  const ref = useRef<T | null>(null);
  const [isIntersecting, setIntersecting] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let frame = 0;
    const observer = new IntersectionObserver((entries) => {
      // rAF throttle intersection updates
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const entry = entries[0];
        setIntersecting(entry.isIntersecting);
      });
    }, options);
    observer.observe(node);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [options.root, options.rootMargin, options.threshold]);

  return { ref, isIntersecting } as const;
}


