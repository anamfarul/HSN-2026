import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  maxAlpha: number;
  alphaSpeed: number;
}

export const HeroParticlesCanvas: React.FC<{ className?: string }> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('resize', handleResize);

    // Color palette: Cyan (#00D9F5), Gold (#F2C96D), Emerald (#008F72), Soft White
    const colors = [
      'rgba(0, 217, 245, ', // Cyan
      'rgba(242, 201, 109, ', // Gold
      'rgba(0, 143, 114, ', // Emerald
      'rgba(255, 255, 255, ', // Starlight
    ];

    const particleCount = Math.min(45, Math.floor((width * height) / 25000));
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const colorBase = colors[Math.floor(Math.random() * colors.length)];
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2 + 0.8,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35 - 0.1, // subtle upward drift
        alpha: Math.random() * 0.7 + 0.2,
        maxAlpha: Math.random() * 0.6 + 0.3,
        alphaSpeed: (Math.random() * 0.01 + 0.005) * (Math.random() > 0.5 ? 1 : -1),
        color: colorBase,
      });
    }

    let isVisible = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0.1 }
    );
    observer.observe(canvas);

    const render = () => {
      if (isVisible) {
        ctx.clearRect(0, 0, width, height);

        // Update and draw particles
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];

          p.x += p.vx;
          p.y += p.vy;
          p.alpha += p.alphaSpeed;

          if (p.alpha > p.maxAlpha || p.alpha < 0.1) {
            p.alphaSpeed = -p.alphaSpeed;
          }

          // Wrap edges
          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = height;
          if (p.y > height) p.y = 0;

          // Draw particle
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = `${p.color}${Math.max(0, Math.min(1, p.alpha))})`;
          ctx.shadowColor = p.color.includes('217') ? '#00D9F5' : '#F2C96D';
          ctx.shadowBlur = 8;
          ctx.fill();

          // Connect very nearby particles with subtle faint line
          for (let j = i + 1; j < particles.length; j++) {
            const p2 = particles[j];
            const dx = p.x - p2.x;
            const dy = p.y - p2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 85) {
              const lineAlpha = (1 - dist / 85) * 0.15;
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.strokeStyle = `rgba(0, 217, 245, ${lineAlpha})`;
              ctx.lineWidth = 0.6;
              ctx.shadowBlur = 0;
              ctx.stroke();
            }
          }
        }
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none z-10 ${className}`}
      aria-hidden="true"
    />
  );
};
