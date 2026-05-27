import { useMemo } from 'react';
import type { ContactGraphData } from '../../lib/recap/selectors';
import styles from './RecapContactGraph.module.css';

interface Props {
  data: ContactGraphData;
}

const SIZE = 360;
const CENTER = SIZE / 2;
const EGO_RADIUS = 24;
const NODE_RADIUS = 14;
const RING_PADDING = 30;

export function RecapContactGraph({ data }: Props) {
  const { nodes, edges } = data;
  const others = useMemo(() => nodes.filter((n) => !n.isMe), [nodes]);

  // Place "others" on concentric rings (up to 24 per ring), evenly spaced.
  const positions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    map.set(
      nodes.find((n) => n.isMe)?.id ?? '_me',
      { x: CENTER, y: CENTER },
    );
    const perRing = 18;
    const ringGap = 70;
    const maxRadius = CENTER - RING_PADDING;

    others.forEach((node, i) => {
      const ring = Math.floor(i / perRing);
      const idxInRing = i % perRing;
      const inRing = Math.min(perRing, others.length - ring * perRing);
      const radius = Math.min(maxRadius, 80 + ring * ringGap);
      // Offset each ring's start angle so nodes don't stack radially.
      const startAngle = ring * 0.31;
      const angle = startAngle + (idxInRing / inRing) * Math.PI * 2;
      map.set(node.id, {
        x: CENTER + Math.cos(angle) * radius,
        y: CENTER + Math.sin(angle) * radius,
      });
    });

    return map;
  }, [nodes, others]);

  if (others.length === 0) {
    return (
      <section className={styles.section}>
        <h2 className={styles.title}>Граф контактов</h2>
        <p className={styles.empty}>
          На кэмпе подтверждённых встреч не было. Зато в следующий раз сетка получится 🚀
        </p>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>Граф контактов</h2>
      <p className={styles.subtitle}>
        Ты в центре. Каждая точка — человек, с которым подтвердили знакомство.
      </p>

      <div className={styles.graphWrap}>
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          width="100%"
          className={styles.svg}
          role="img"
          aria-label={`Граф из ${others.length} контактов`}
        >
          {/* Edges first so nodes draw on top */}
          {edges.map((e, i) => {
            const a = positions.get(e.source);
            const b = positions.get(e.target);
            if (!a || !b) return null;
            return (
              <line
                key={`e-${i}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                className={styles.edge}
              />
            );
          })}

          {/* Ego node */}
          <circle cx={CENTER} cy={CENTER} r={EGO_RADIUS} className={styles.egoNode} />

          {/* Other nodes */}
          {others.map((node) => {
            const p = positions.get(node.id);
            if (!p) return null;
            return (
              <g key={node.id}>
                <circle cx={p.x} cy={p.y} r={NODE_RADIUS} className={styles.node}>
                  <title>{`@${node.id}`}</title>
                </circle>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
