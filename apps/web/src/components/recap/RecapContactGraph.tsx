import { useMemo } from 'react';
import type { RecapGraph } from '@vklube/shared';
import { layoutGraph } from '../../lib/recap/graphLayout';
import styles from './RecapContactGraph.module.css';

interface Props {
  graph: RecapGraph;
  meId: string;
  /** True if showing a partial (ego-only) graph because the full one isn't available. */
  isLocalFallback?: boolean;
}

const SIZE = 520;

export function RecapContactGraph({ graph, meId, isLocalFallback }: Props) {
  const layout = useMemo(
    () => layoutGraph(graph, meId, { width: SIZE, height: SIZE }),
    [graph, meId],
  );

  const otherCount =
    layout.nodes.length - (layout.nodes.some((n) => n.id === meId) ? 1 : 0);

  if (otherCount === 0) {
    return (
      <section className={styles.section}>
        <h2 className={styles.title}>Граф контактов</h2>
        <p className={styles.empty}>
          На кэмпе подтверждённых встреч не было. Зато в следующий раз сетка получится 🚀
        </p>
      </section>
    );
  }

  const maxDegree = Math.max(1, ...layout.nodes.map((n) => n.degree));
  const posById = new Map(layout.nodes.map((n) => [n.id, n]));

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>Граф контактов</h2>
      <p className={styles.subtitle}>
        {isLocalFallback
          ? 'Твои подтверждённые знакомства. Подключись к сети, чтобы увидеть весь граф кэмпа.'
          : 'Все подтверждённые знакомства кэмпа. Ты — выделенная точка.'}
      </p>

      <div className={styles.graphWrap}>
        <svg
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          width="100%"
          className={styles.svg}
          role="img"
          aria-label={`Граф из ${layout.nodes.length} человек и ${layout.edges.length} связей`}
        >
          {layout.edges.map((e, i) => {
            const a = posById.get(e.source);
            const b = posById.get(e.target);
            if (!a || !b) return null;
            const touchesMe = a.id === meId || b.id === meId;
            return (
              <line
                key={`e-${i}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                className={touchesMe ? styles.edgeMine : styles.edge}
              />
            );
          })}

          {layout.nodes.map((node) => {
            const isMe = node.id === meId;
            const r = isMe ? 9 : Math.max(2.5, 2.5 + (node.degree / maxDegree) * 4.5);
            return (
              <circle
                key={node.id}
                cx={node.x}
                cy={node.y}
                r={r}
                className={isMe ? styles.egoNode : styles.node}
              >
                <title>{`@${node.id} · ${node.degree} ${pluralizeContacts(node.degree)}`}</title>
              </circle>
            );
          })}
        </svg>
      </div>

      <div className={styles.legend}>
        <span>{layout.nodes.length} участников</span>
        <span aria-hidden="true">·</span>
        <span>{layout.edges.length} связей</span>
      </div>
    </section>
  );
}

function pluralizeContacts(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'контакт';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'контакта';
  return 'контактов';
}
