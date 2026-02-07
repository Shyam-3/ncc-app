import React, { useEffect, useRef, useState } from 'react';

interface AnimatedSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType;
  effect?: 'fade' | 'slide';
  delay?: number; // seconds
  threshold?: number; // intersection threshold
}

const AnimatedSection: React.FC<AnimatedSectionProps> = ({
  as: Component = 'div',
  effect = 'slide',
  delay = 0,
  threshold = 0.15,
  className = '',
  children,
  ...rest
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  const effectClass = effect === 'fade' ? 'fade-in' : 'slide-up';
  const style: React.CSSProperties = {
    animationDelay: `${delay}s`,
  };

  return (
    <Component
      ref={ref}
      className={`${className} ${visible ? effectClass : ''}`.trim()}
      style={style}
      {...rest}
    >
      {children}
    </Component>
  );
};

export default AnimatedSection;
