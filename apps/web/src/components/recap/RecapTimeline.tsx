import { useMemo } from 'react';
import type { TimelinePoint } from '../../lib/recap/selectors';
import { formatRussianDate } from '../../lib/recap/funStats';
import styles from './RecapTimeline.module.css';

interface Props {
  points: TimelinePoint[];
}

const W = 600;
const H = 220;
const PAD = { top: 16, right: 12, bottom: 32, left: 28 };
const INNER_W = W - PAD.left - PAD.right;
const INNER_H = H - PAD.top - PAD.bottom;

export function RecapTimeline({ points }: Props) {
  const path = useMemo(() => buildPath(points), [points]);

  if (points.length === 0) {
    return (
      <section className={styles.section}>
        <h2 className={styles.title}>Таймлайн знакомств</h2>
        <p className={styles.empty}>Пока нет данных для графика.</p>
      </section>
    );
  }

  const maxY = Math.max(1, ...points.map((p) => p.cumulative));
  const xStep = points.length > 1 ? INNER_W / (points.length - 1) : 0;
  const ticks = [
    { i: 0, label: formatRussianDate(points[0]!.date) },
    {
      i: points.length - 1,
      label: formatRussianDate(points[points.length - 1]!.date),
    },
  ];

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>Таймлайн знакомств</h2>
      <p className={styles.subtitle}>
        Как накапливались контакты день за днём.
      </p>

      <div className={styles.chartWrap}>
        <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg} role="img" aria-label="Кумулятивный график контактов">
          {/* Y axis ticks */}
          {buildYTicks(maxY).map((y) => {
            const yy = PAD.top + INNER_H - (y / maxY) * INNER_H;
            return (
              <g key={`y-${y}`}>
                <line x1={PAD.left} x2={W - PAD.right} y1={yy} y2={yy} className={styles.grid} />
                <text x={PAD.left - 6} y={yy + 4} className={styles.tickText} textAnchor="end">
                  {y}
                </text>
              </g>
            );
          })}

          {/* Area + line */}
          <path d={path.area} className={styles.area} />
          <path d={path.line} className={styles.line} />

          {/* Points */}
          {points.map((p, i) => {
            const x = PAD.left + i * xStep;
            const y = PAD.top + INNER_H - (p.cumulative / maxY) * INNER_H;
            return <circle key={i} cx={x} cy={y} r={3} className={styles.dot} />;
          })}

          {/* X labels */}
          {ticks.map(({ i, label }) => {
            const x = PAD.left + i * xStep;
            return (
              <text
                key={`x-${i}`}
                x={x}
                y={H - 8}
                className={styles.tickText}
                textAnchor={i === 0 ? 'start' : 'end'}
              >
                {label}
              </text>
            );
          })}
        </svg>
      </div>
    </section>
  );
}

function buildPath(pts: TimelinePoint[]): { line: string; area: string } {
  if (pts.length === 0) return { line: '', area: '' };
  const max = Math.max(1, ...pts.map((p) => p.cumulative));
  const step = pts.length > 1 ? INNER_W / (pts.length - 1) : 0;
  const coords = pts.map((p, i) => {
    const x = PAD.left + i * step;
    const y = PAD.top + INNER_H - (p.cumulative / max) * INNER_H;
    return { x, y };
  });
  const line = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ');
  const baseY = PAD.top + INNER_H;
  const area = `${line} L ${coords[coords.length - 1]!.x.toFixed(1)} ${baseY} L ${coords[0]!.x.toFixed(1)} ${baseY} Z`;
  return { line, area };
}

function buildYTicks(max: number): number[] {
  if (max <= 4) return Array.from({ length: max + 1 }, (_, i) => i);
  const step = Math.ceil(max / 4);
  const out: number[] = [];
  for (let v = 0; v <= max; v += step) out.push(v);
  if (out[out.length - 1] !== max) out.push(max);
  return out;
}
