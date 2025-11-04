import React, { useMemo } from "react";

type SparklesProps = {
  density?: number;
  heroCount?: number;
  minSize?: number;
  maxSize?: number;
  twinkle?: boolean;
  className?: string;
};

export default function Sparkles({
  density = 100,
  heroCount = 6,
  minSize = 2,
  maxSize = 6,
  twinkle = true,
  className = ""
}: SparklesProps) {
  const points = useMemo(() => {
    const regularSparkles = Array.from({ length: density }, (_, i) => {
      const size = minSize + Math.random() * (maxSize - minSize);
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const delay = Math.random() * 18;
      const duration = 12 + Math.random() * 6;
      const type = Math.random() < 0.4 ? "star" : "dot";
      const opacity = 0.15 + Math.random() * 0.25;
      return { x, y, size, delay, duration, type, opacity, isHero: false };
    });

    const heroSparkles = Array.from({ length: heroCount }, (_, i) => {
      const size = 10 + Math.random() * 4;
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const delay = Math.random() * 18;
      const duration = 12 + Math.random() * 6;
      const type = "star";
      const opacity = 0.6 + Math.random() * 0.2;
      return { x, y, size, delay, duration, type, opacity, isHero: true };
    });

    return [...regularSparkles, ...heroSparkles];
  }, [density, heroCount, minSize, maxSize]);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-0 ${className}`}
    >
      <svg 
        viewBox="0 0 100 100" 
        preserveAspectRatio="none" 
        className="h-full w-full"
      >
        <defs>
          <radialGradient id="sparkGrad" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="60%" stopColor="#E7E0FF" />
            <stop offset="100%" stopColor="#BFA7FF" />
          </radialGradient>
          <radialGradient id="heroSparkGrad" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#E7E0FF" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#BFA7FF" stopOpacity="0.6" />
          </radialGradient>
          <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="heroGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {points.map((p, i) => {
          const gradientId = p.isHero ? "heroSparkGrad" : "sparkGrad";
          const filterId = p.isHero ? "heroGlow" : "softGlow";
          
          if (p.type === "star") {
            const starPoints = `
              ${p.x},${p.y - p.size * 0.5}
              ${p.x + p.size * 0.15},${p.y - p.size * 0.15}
              ${p.x + p.size * 0.5},${p.y}
              ${p.x + p.size * 0.15},${p.y + p.size * 0.15}
              ${p.x},${p.y + p.size * 0.5}
              ${p.x - p.size * 0.15},${p.y + p.size * 0.15}
              ${p.x - p.size * 0.5},${p.y}
              ${p.x - p.size * 0.15},${p.y - p.size * 0.15}
            `;
            
            return (
              <polygon
                key={i}
                points={starPoints}
                fill={`url(#${gradientId})`}
                opacity={p.opacity}
                filter={`url(#${filterId})`}
                style={{
                  transformOrigin: `${p.x}% ${p.y}%`,
                  animation: twinkle
                    ? `sparkle-twinkle ${p.duration}s ${p.delay}s infinite ease-in-out`
                    : undefined
                }}
              />
            );
          } else {
            return (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={p.size * 0.3}
                fill={`url(#${gradientId})`}
                opacity={p.opacity}
                filter={`url(#${filterId})`}
                style={{
                  transformOrigin: `${p.x}% ${p.y}%`,
                  animation: twinkle
                    ? `sparkle-pulse ${p.duration}s ${p.delay}s infinite ease-in-out`
                    : undefined
                }}
              />
            );
          }
        })}
      </svg>
      <style jsx>{`
        @keyframes sparkle-twinkle {
          0%, 100% { 
            transform: scale(1) rotate(0deg); 
            opacity: ${0.3}; 
            filter: blur(0.2px); 
          }
          50% { 
            transform: scale(1.5) rotate(180deg); 
            opacity: 1; 
            filter: blur(0px); 
          }
        }
        
        @keyframes sparkle-pulse {
          0%, 100% { 
            transform: scale(1); 
            opacity: ${0.4}; 
            filter: blur(0.3px); 
          }
          50% { 
            transform: scale(1.3); 
            opacity: 1; 
            filter: blur(0px); 
          }
        }
        
        @media (prefers-reduced-motion: reduce) {
          svg [style*="animation"] { 
            animation: none !important; 
          }
        }
      `}</style>
    </div>
  );
}