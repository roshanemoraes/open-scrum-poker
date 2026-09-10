import { useRef } from 'react';

// Purple radial ripple emanating from the click point, ~150ms, no deps.
export default function RippleButton({ className = '', onClick, children, ...rest }) {
  const ref = useRef(null);

  function handleClick(e) {
    const btn = ref.current;
    if (btn && typeof btn.animate === 'function') {
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.6;
      const span = document.createElement('span');
      span.style.position = 'absolute';
      span.style.left = e.clientX - rect.left - size / 2 + 'px';
      span.style.top = e.clientY - rect.top - size / 2 + 'px';
      span.style.width = size + 'px';
      span.style.height = size + 'px';
      span.style.borderRadius = '9999px';
      span.style.background = 'radial-gradient(circle, rgba(124,58,237,0.35) 0%, rgba(124,58,237,0) 70%)';
      span.style.pointerEvents = 'none';
      btn.appendChild(span);
      const anim = span.animate(
        [
          { opacity: 0.6, transform: 'scale(0)' },
          { opacity: 0, transform: 'scale(1)' },
        ],
        { duration: 150, easing: 'ease-out' }
      );
      anim.onfinish = () => span.remove();
    }
    onClick?.(e);
  }

  return (
    <button ref={ref} {...rest} onClick={handleClick} className={`relative overflow-hidden ${className}`}>
      {children}
    </button>
  );
}
