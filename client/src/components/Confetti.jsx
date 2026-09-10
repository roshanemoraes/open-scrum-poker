import { useEffect, useRef } from 'react';

const COLORS = ['#e879f9', '#22d3ee', '#a3e635', '#7c3aed', '#f472b6'];
const SHAPES = ['circle', 'square', 'rect'];

// Fires a full-viewport confetti burst whenever `burstKey` changes to a
// truthy value (0 on mount is ignored). Particles are plain divs animated
// with the Web Animations API and removed once they finish — no library.
export default function Confetti({ burstKey, originRef }) {
  const layerRef = useRef(null);

  useEffect(() => {
    if (!burstKey) return;
    const layer = layerRef.current;
    if (!layer) return;

    const origin = originRef?.current?.getBoundingClientRect();
    const cx = origin ? origin.left + origin.width / 2 : window.innerWidth / 2;
    const cy = origin ? origin.top + origin.height / 2 : window.innerHeight / 2;

    const pieces = [];
    const count = 90;
    for (let i = 0; i < count; i++) {
      const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const size = 5 + Math.random() * 6;

      const el = document.createElement('div');
      el.style.position = 'fixed';
      el.style.left = cx + 'px';
      el.style.top = cy + 'px';
      el.style.width = (shape === 'rect' ? size * 0.4 : size) + 'px';
      el.style.height = (shape === 'rect' ? size * 1.8 : size) + 'px';
      el.style.background = color;
      el.style.borderRadius = shape === 'circle' ? '50%' : '2px';
      el.style.willChange = 'transform, opacity';
      layer.appendChild(el);
      pieces.push(el);

      const angle = Math.random() * Math.PI * 2;
      const burst = 160 + Math.random() * 320;
      const dx = Math.cos(angle) * burst;
      const fallY = 520 + Math.random() * window.innerHeight * 0.9;
      const rotate = (Math.random() > 0.5 ? 1 : -1) * (260 + Math.random() * 420);
      const duration = 3600 + Math.random() * 1800;
      const delay = Math.random() * 350;

      const anim = el.animate(
        [
          { transform: 'translate(0px, 0px) rotate(0deg)', opacity: 1 },
          { transform: `translate(${dx * 0.7}px, ${-90 - Math.random() * 140}px) rotate(${rotate * 0.3}deg)`, opacity: 1, offset: 0.18 },
          { transform: `translate(${dx}px, ${fallY}px) rotate(${rotate}deg)`, opacity: 1, offset: 0.85 },
          { transform: `translate(${dx}px, ${fallY}px) rotate(${rotate}deg)`, opacity: 0 },
        ],
        { duration, delay, easing: 'cubic-bezier(0.15, 0.4, 0.25, 1)', fill: 'forwards' }
      );
      anim.onfinish = () => el.remove();
    }

    const cleanup = setTimeout(() => pieces.forEach((el) => el.remove()), 9200);
    return () => {
      clearTimeout(cleanup);
      pieces.forEach((el) => el.remove());
    };
  }, [burstKey, originRef]);

  return <div ref={layerRef} className="fixed inset-0 pointer-events-none z-[999]" />;
}
