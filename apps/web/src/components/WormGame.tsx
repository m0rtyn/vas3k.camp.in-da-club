import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './WormGame.module.css';

const COLS = 16;
const ROWS = 16;
const TICK_MS = 180;

type Dir = { x: number; y: number };
type Cell = { x: number; y: number };

const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
} as const;

const INITIAL_WORM: Cell[] = [
  { x: 7, y: 8 },
  { x: 6, y: 8 },
  { x: 5, y: 8 },
];

function randomEmpty(occupied: Cell[]): Cell {
  while (true) {
    const c = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS),
    };
    if (!occupied.some((o) => o.x === c.x && o.y === c.y)) return c;
  }
}

export function WormGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wormRef = useRef<Cell[]>([...INITIAL_WORM]);
  const dirRef = useRef<Dir>(DIRS.right);
  const pendingDirRef = useRef<Dir>(DIRS.right);
  const homeRef = useRef<Cell>(randomEmpty(INITIAL_WORM));
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const [score, setScore] = useState(0);
  const [running, setRunning] = useState(true);
  const [message, setMessage] = useState('');

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cssSize = canvas.clientWidth;
    if (cssSize === 0) return;
    const dpr = window.devicePixelRatio || 1;
    const pxSize = Math.floor(cssSize * dpr);
    if (canvas.width !== pxSize) {
      canvas.width = pxSize;
      canvas.height = pxSize;
    }
    const cell = pxSize / COLS;
    const css = getComputedStyle(canvas);
    const bg = css.getPropertyValue('--game-bg').trim() || '#1a1a1a';
    const grid = css.getPropertyValue('--game-grid').trim() || '#2a2a2a';

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, pxSize, pxSize);

    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    for (let i = 1; i < COLS; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cell, 0);
      ctx.lineTo(i * cell, pxSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cell);
      ctx.lineTo(pxSize, i * cell);
      ctx.stroke();
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${cell * 0.8}px serif`;
    const home = homeRef.current;
    ctx.fillText('🏠', home.x * cell + cell / 2, home.y * cell + cell / 2);

    const worm = wormRef.current;
    worm.forEach((seg, i) => {
      ctx.fillStyle = i === 0 ? '#e879a8' : '#c0608c';
      const pad = cell * 0.1;
      const r = cell * 0.25;
      const x = seg.x * cell + pad;
      const y = seg.y * cell + pad;
      const w = cell - pad * 2;
      const h = cell - pad * 2;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
      ctx.fill();
    });

    const head = worm[0];
    ctx.font = `${cell * 0.7}px serif`;
    ctx.fillText('🪱', head.x * cell + cell / 2, head.y * cell + cell / 2);
  }, []);

  const reset = useCallback(() => {
    wormRef.current = [...INITIAL_WORM];
    dirRef.current = DIRS.right;
    pendingDirRef.current = DIRS.right;
    homeRef.current = randomEmpty(INITIAL_WORM);
    setScore(0);
    setMessage('');
    setRunning(true);
  }, []);

  // Game loop
  useEffect(() => {
    if (!running) {
      draw();
      return;
    }
    const id = window.setInterval(() => {
      const cur = dirRef.current;
      const d = pendingDirRef.current;
      // Prevent immediate reversal into the body
      if (!(d.x === -cur.x && d.y === -cur.y && wormRef.current.length > 1)) {
        dirRef.current = d;
      }
      const worm = wormRef.current;
      const head = worm[0];
      const next = { x: head.x + dirRef.current.x, y: head.y + dirRef.current.y };

      if (next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS) {
        setRunning(false);
        setMessage('Червяк уполз в кусты 🌿');
        return;
      }
      if (worm.some((s, i) => i !== worm.length - 1 && s.x === next.x && s.y === next.y)) {
        setRunning(false);
        setMessage('Червяк завязался узлом 🪢');
        return;
      }

      const grew = next.x === homeRef.current.x && next.y === homeRef.current.y;
      const newWorm = [next, ...worm];
      if (grew) {
        setScore((s) => s + 1);
        homeRef.current = randomEmpty(newWorm);
      } else {
        newWorm.pop();
      }
      wormRef.current = newWorm;
      draw();
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [running, draw]);

  // Initial draw + redraw on resize
  useEffect(() => {
    draw();
    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [draw]);

  // Keyboard controls
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = {
        ArrowUp: DIRS.up,
        ArrowDown: DIRS.down,
        ArrowLeft: DIRS.left,
        ArrowRight: DIRS.right,
        w: DIRS.up,
        s: DIRS.down,
        a: DIRS.left,
        d: DIRS.right,
      };
      const d = map[e.key];
      if (d) {
        e.preventDefault();
        pendingDirRef.current = d;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    touchStart.current = null;
    if (Math.abs(dx) < 16 && Math.abs(dy) < 16) return;
    pendingDirRef.current =
      Math.abs(dx) > Math.abs(dy)
        ? dx > 0
          ? DIRS.right
          : DIRS.left
        : dy > 0
          ? DIRS.down
          : DIRS.up;
  };

  const press = (d: Dir) => () => {
    pendingDirRef.current = d;
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.hud}>
        <span className={styles.score}>🏠 {score}</span>
        {message && <span className={styles.message}>{message}</span>}
      </div>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      />
      <div className={styles.controls}>
        <div />
        <button type="button" className={styles.padBtn} onClick={press(DIRS.up)} aria-label="Вверх">▲</button>
        <div />
        <button type="button" className={styles.padBtn} onClick={press(DIRS.left)} aria-label="Влево">◀</button>
        <button type="button" className={styles.padBtn} onClick={press(DIRS.down)} aria-label="Вниз">▼</button>
        <button type="button" className={styles.padBtn} onClick={press(DIRS.right)} aria-label="Вправо">▶</button>
      </div>
      {!running && (
        <button type="button" className={styles.restart} onClick={reset}>
          Помочь червяку ещё раз
        </button>
      )}
    </div>
  );
}
