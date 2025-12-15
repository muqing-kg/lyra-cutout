import React, { useEffect, useRef, useState } from 'react';

export default function Lightbox({ open, images = [], index = 0, onClose, onIndexChange }) {
  const [i, setI] = useState(index);
  const [zoom, setZoom] = useState(false);
  const containerRef = useRef(null);
  const touchStart = useRef(null);
  const wheelCooldown = useRef(0);
  const overlayRef = useRef(null);

  useEffect(() => {
    setI(index);
  }, [index]);

  useEffect(() => {
    if (!open) return;
    if (!images || images.length === 0) {
      onClose?.();
      return;
    }
    if (index >= images.length) {
      const ni = Math.max(0, images.length - 1);
      setI(ni);
      onIndexChange?.(ni);
    }
  }, [open, images, images.length]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    try { overlayRef.current?.focus(); } catch {}
    return () => {
      document.documentElement.style.overflow = prevOverflow || '';
    };
  }, [open, zoom]);

  const onKey = (e) => {
    if (!open) return;
    if (e.key === 'Escape') onClose?.();
    else if (e.key === 'ArrowRight') next();
    else if (e.key === 'ArrowLeft') prev();
  };

  const onWheel = (e) => {
    if (!open) return;
    if (zoom) return; // let native scroll handle
    const now = Date.now();
    if (now - wheelCooldown.current < 180) return;
    wheelCooldown.current = now;
    const move = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (move > 0) next();
    else prev();
    e.preventDefault();
  };

  const next = () => {
    const ni = (i + 1) % images.length;
    setI(ni);
    onIndexChange?.(ni);
  };
  const prev = () => {
    const pi = (i - 1 + images.length) % images.length;
    setI(pi);
    onIndexChange?.(pi);
  };

  const onTouchStart = (e) => {
    if (e.touches && e.touches.length === 1) {
      touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };
  const onTouchEnd = (e) => {
    const s = touchStart.current;
    if (!s) return;
    const x = e.changedTouches[0].clientX;
    const dx = x - s.x;
    if (Math.abs(dx) > 50) {
      if (dx < 0) next();
      else prev();
    }
    touchStart.current = null;
  };

  if (!open) return null;

  return (
    <div
      className="lightbox-overlay"
      ref={overlayRef}
      tabIndex={0}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      onTouchMove={(e) => e.preventDefault()}
      onKeyDown={onKey}
      onWheel={onWheel}
    >
      {images.length > 1 && (
        <>
          <button className="lightbox-nav left" onClick={prev}>‹</button>
          <button className="lightbox-nav right" onClick={next}>›</button>
        </>
      )}
      <div
        className={`lightbox-container ${zoom ? 'zoom' : ''}`}
        ref={containerRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <img
          src={images[i] || images[0]}
          alt={`preview-${i + 1}`}
          className={`lightbox-image ${zoom ? 'zoom' : ''}`}
          onDoubleClick={() => setZoom((z) => !z)}
          onClick={() => setZoom((z) => !z)}
        />
      </div>
      <div className="lightbox-toolbar">
        <span className="lightbox-counter">{i + 1}/{images.length}</span>
        <button className="lightbox-close" onClick={onClose}>✕</button>
      </div>
    </div>
  );
}
