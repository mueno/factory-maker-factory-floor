'use client';

// React wrapper for the on-device world (Solaris pattern B). Owns the canvas,
// the WebGPU handle, and the window-level pointer signal; reports capability
// so the host can show/hide the toggle honestly.

import { useEffect, useRef } from 'react';
import { createWorld, type WorldHandle } from './world';

type WorldLayerProps = {
  active: boolean;
  onCapability: (supported: boolean) => void;
  onHandle: (handle: WorldHandle | null) => void;
};

export function WorldLayer({ active, onCapability, onHandle }: WorldLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<WorldHandle | null>(null);
  const lastRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!active) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !navigator.gpu) {
      onCapability(false);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    createWorld(canvas).then((handle) => {
      if (disposed) { handle?.destroy(); return; }
      handleRef.current = handle;
      onCapability(Boolean(handle));
      onHandle(handle);
      // Debug hook for tests and tuning (harmless in production).
      (window as unknown as { __adlibWorld?: WorldHandle | null }).__adlibWorld = handle;
    });
    const onPointer = (event: PointerEvent) => {
      const handle = handleRef.current;
      if (!handle) return;
      const nx = event.clientX / Math.max(1, window.innerWidth);
      const ny = event.clientY / Math.max(1, window.innerHeight);
      const last = lastRef.current;
      lastRef.current = { x: nx, y: ny };
      if (!last) return;
      handle.pointer(nx, ny, Math.max(-0.08, Math.min(0.08, nx - last.x)), Math.max(-0.08, Math.min(0.08, ny - last.y)));
    };
    window.addEventListener('pointermove', onPointer, { passive: true });
    return () => {
      disposed = true;
      window.removeEventListener('pointermove', onPointer);
      handleRef.current?.destroy();
      handleRef.current = null;
      onHandle(null);
    };
  }, [active, onCapability, onHandle]);

  if (!active) return null;
  return <canvas aria-hidden="true" className="adlib-world-canvas" ref={canvasRef} />;
}
