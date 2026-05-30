import type { RecapGraph } from '@vklube/shared';

export interface LaidOutNode {
  id: string;
  x: number;
  y: number;
  degree: number;
}

export interface LaidOutGraph {
  nodes: LaidOutNode[];
  edges: Array<{ source: string; target: string }>;
  width: number;
  height: number;
}

interface Options {
  width?: number;
  height?: number;
  iterations?: number;
  /** Repulsion strength between every pair of nodes. */
  repulsion?: number;
  /** Spring rest length between connected nodes. */
  springLength?: number;
  /** Spring stiffness. */
  springK?: number;
  /** Pull toward center each iteration. */
  gravity?: number;
  /** Damping factor applied to displacement each iteration. */
  damping?: number;
  /** RNG seed for deterministic initial positions. */
  seed?: number;
}

/**
 * Tiny deterministic force-directed layout.
 * Designed for 50–300 nodes; runs synchronously in <100ms on typical hardware.
 */
export function layoutGraph(
  graph: RecapGraph,
  meId: string | null,
  opts: Options = {},
): LaidOutGraph {
  const W = opts.width ?? 600;
  const H = opts.height ?? 600;
  const iterations = opts.iterations ?? 220;
  const baseRepulsion = opts.repulsion ?? 2200;
  const springLength = opts.springLength ?? 60;
  const springK = opts.springK ?? 0.05;
  const gravity = opts.gravity ?? 0.012;
  const damping = opts.damping ?? 0.85;
  const seed = opts.seed ?? 42;

  const n = graph.nodes.length;
  if (n === 0) {
    return { nodes: [], edges: [], width: W, height: H };
  }

  // Degrees for sizing later.
  const degree = new Map<string, number>();
  for (const e of graph.edges) {
    degree.set(e.a, (degree.get(e.a) ?? 0) + 1);
    degree.set(e.b, (degree.get(e.b) ?? 0) + 1);
  }

  // Seeded PRNG (Mulberry32) for deterministic initial layout.
  let s = seed >>> 0;
  const rand = () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const cx = W / 2;
  const cy = H / 2;
  const initialRadius = Math.min(W, H) * 0.35;

  // Initialize positions on a circle (ego node pinned to center if present).
  const px = new Float32Array(n);
  const py = new Float32Array(n);
  const idx = new Map<string, number>();
  graph.nodes.forEach((node, i) => {
    idx.set(node.username, i);
    if (node.username === meId) {
      px[i] = cx;
      py[i] = cy;
    } else {
      const angle = rand() * Math.PI * 2;
      const r = initialRadius * (0.6 + rand() * 0.5);
      px[i] = cx + Math.cos(angle) * r;
      py[i] = cy + Math.sin(angle) * r;
    }
  });

  const dx = new Float32Array(n);
  const dy = new Float32Array(n);

  // Pre-compute edge index pairs.
  const edgePairs: Array<[number, number]> = [];
  for (const e of graph.edges) {
    const i = idx.get(e.a);
    const j = idx.get(e.b);
    if (i !== undefined && j !== undefined && i !== j) {
      edgePairs.push([i, j]);
    }
  }

  // Repulsion is scaled down for very dense graphs to keep them in bounds.
  const repulsion = baseRepulsion * Math.min(1, 80 / Math.max(20, n));

  for (let iter = 0; iter < iterations; iter++) {
    dx.fill(0);
    dy.fill(0);

    // Repulsion between all pairs (Barnes-Hut would be overkill for n < 400).
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let ddx = px[i]! - px[j]!;
        let ddy = py[i]! - py[j]!;
        let dist2 = ddx * ddx + ddy * ddy;
        if (dist2 < 0.01) {
          ddx = (rand() - 0.5) * 0.5;
          ddy = (rand() - 0.5) * 0.5;
          dist2 = ddx * ddx + ddy * ddy + 0.01;
        }
        const force = repulsion / dist2;
        const fx = ddx * force;
        const fy = ddy * force;
        dx[i]! += fx;
        dy[i]! += fy;
        dx[j]! -= fx;
        dy[j]! -= fy;
      }
    }

    // Spring attraction along edges.
    for (const [i, j] of edgePairs) {
      const ddx = px[j]! - px[i]!;
      const ddy = py[j]! - py[i]!;
      const dist = Math.sqrt(ddx * ddx + ddy * ddy) || 0.01;
      const f = springK * (dist - springLength);
      const fx = (ddx / dist) * f;
      const fy = (ddy / dist) * f;
      dx[i]! += fx;
      dy[i]! += fy;
      dx[j]! -= fx;
      dy[j]! -= fy;
    }

    // Gravity toward center + apply displacement.
    const t = 1 - iter / iterations;
    const step = damping * (0.3 + 0.7 * t);
    for (let i = 0; i < n; i++) {
      dx[i]! += (cx - px[i]!) * gravity;
      dy[i]! += (cy - py[i]!) * gravity;
      // Cap per-iteration motion to avoid blow-ups early on.
      const max = 12;
      let vx = dx[i]! * step;
      let vy = dy[i]! * step;
      const m2 = vx * vx + vy * vy;
      if (m2 > max * max) {
        const k = max / Math.sqrt(m2);
        vx *= k;
        vy *= k;
      }
      // Pin ego node.
      if (graph.nodes[i]!.username === meId) continue;
      px[i]! += vx;
      py[i]! += vy;
    }
  }

  // Re-center and rescale to viewport with padding.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < n; i++) {
    if (px[i]! < minX) minX = px[i]!;
    if (px[i]! > maxX) maxX = px[i]!;
    if (py[i]! < minY) minY = py[i]!;
    if (py[i]! > maxY) maxY = py[i]!;
  }
  const pad = 28;
  const scaleX = (W - pad * 2) / Math.max(1, maxX - minX);
  const scaleY = (H - pad * 2) / Math.max(1, maxY - minY);
  const scale = Math.min(scaleX, scaleY);

  const nodes: LaidOutNode[] = graph.nodes.map((node, i) => ({
    id: node.username,
    x: pad + (px[i]! - minX) * scale,
    y: pad + (py[i]! - minY) * scale,
    degree: degree.get(node.username) ?? 0,
  }));

  return {
    nodes,
    edges: edgePairs.map(([i, j]) => ({
      source: graph.nodes[i]!.username,
      target: graph.nodes[j]!.username,
    })),
    width: W,
    height: H,
  };
}

/** Builds a local-only ego graph from confirmed meetings of the current user. */
export function buildLocalEgoGraph(
  meetings: Array<{ status: string; initiator_username: string; target_username: string; initiator_camp_username: string; target_camp_username: string }>,
  me: { username: string; camp_username: string },
): RecapGraph {
  const nodes = new Map<string, { username: string; camp_username: string | null }>();
  nodes.set(me.username, { username: me.username, camp_username: me.camp_username });
  const edges: Array<{ a: string; b: string }> = [];
  const seen = new Set<string>();
  for (const m of meetings) {
    if (m.status !== 'confirmed') continue;
    const isInit = m.initiator_username === me.username;
    const isTarg = m.target_username === me.username;
    if (!isInit && !isTarg) continue;
    const other = isInit ? m.target_username : m.initiator_username;
    const otherCamp = isInit ? m.target_camp_username : m.initiator_camp_username;
    if (!nodes.has(other)) {
      nodes.set(other, { username: other, camp_username: otherCamp });
    }
    const key = [me.username, other].sort().join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push({ a: me.username, b: other });
  }
  return { nodes: Array.from(nodes.values()), edges };
}
