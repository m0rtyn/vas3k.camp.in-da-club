import type { Meeting, RecapGraph, RecapStats, User } from '@vklube/shared';

/** Mock user — "you" in the recap preview. */
export const mockUser: User = {
  username: 'm0rtyn',
  camp_username: 'jovial-martyn',
  display_name: 'Мартын',
  avatar_url: '',
  bio: 'Тот самый Мартын, о котором никто не слышал.',
  approvals_available: 3,
  confirmed_contacts_count: 14,
  is_admin: false,
  created_at: '2026-06-04T10:00:00.000Z',
};

interface MockPeer {
  username: string;
  camp_username: string;
  display_name: string;
}

const peers: MockPeer[] = [
  { username: 'vasily', camp_username: 'serene-vasily', display_name: 'Василий' },
  { username: 'alice', camp_username: 'merry-alice', display_name: 'Алиса' },
  { username: 'bob', camp_username: 'cosmic-bob', display_name: 'Боб' },
  { username: 'kate', camp_username: 'wild-kate', display_name: 'Катя' },
  { username: 'igor', camp_username: 'silent-igor', display_name: 'Игорь' },
  { username: 'lena', camp_username: 'gentle-lena', display_name: 'Лена' },
  { username: 'oleg', camp_username: 'brave-oleg', display_name: 'Олег' },
  { username: 'masha', camp_username: 'curious-masha', display_name: 'Маша' },
  { username: 'pasha', camp_username: 'lazy-pasha', display_name: 'Паша' },
  { username: 'nina', camp_username: 'sharp-nina', display_name: 'Нина' },
  { username: 'gosha', camp_username: 'kind-gosha', display_name: 'Гоша' },
  { username: 'rita', camp_username: 'jolly-rita', display_name: 'Рита' },
  { username: 'tony', camp_username: 'noble-tony', display_name: 'Тони' },
  { username: 'sonya', camp_username: 'soft-sonya', display_name: 'Соня' },
  { username: 'fedya', camp_username: 'witty-fedya', display_name: 'Федя' },
  { username: 'dasha', camp_username: 'sunny-dasha', display_name: 'Даша' },
  { username: 'misha', camp_username: 'spicy-misha', display_name: 'Миша' },
  { username: 'yura', camp_username: 'bold-yura', display_name: 'Юра' },
];

/**
 * Mock confirmed meetings for the current user spread across 4 camp days
 * + a sprinkle of meetings the user only witnessed.
 */
function buildMockMeetings(): Meeting[] {
  const me = mockUser;
  const out: Meeting[] = [];

  // Day 1 — June 4: 3 meetings (one late-night)
  // Day 2 — June 5: 5 meetings (most active day)
  // Day 3 — June 6: 2 meetings
  // Day 4 — June 7: 4 meetings
  const schedule: Array<{ date: string; hours: number[] }> = [
    { date: '2026-06-04', hours: [13, 19, 23] },
    { date: '2026-06-05', hours: [10, 12, 15, 18, 21] },
    { date: '2026-06-06', hours: [11, 16] },
    { date: '2026-06-07', hours: [9, 14, 17, 2] }, // last one is 02:xx (late night)
  ];

  let peerIdx = 0;
  let i = 0;
  for (const day of schedule) {
    for (const hour of day.hours) {
      const peer = peers[peerIdx++ % peers.length]!;
      const witness = peers[(peerIdx + 3) % peers.length]!;
      const iso = `${day.date}T${String(hour).padStart(2, '0')}:${String((i * 7) % 60).padStart(2, '0')}:00+02:00`;
      const isInitiator = i % 2 === 0;
      out.push({
        id: `mock-${i}`,
        initiator_username: isInitiator ? me.username : peer.username,
        initiator_camp_username: isInitiator ? me.camp_username : peer.camp_username,
        target_username: isInitiator ? peer.username : me.username,
        target_camp_username: isInitiator ? peer.camp_username : me.camp_username,
        witness_code: null,
        witness_code_expires_at: null,
        witness_username: witness.username,
        witness_camp_username: witness.camp_username,
        status: 'confirmed',
        is_hidden_by_me: false,
        created_at: iso,
        confirmed_at: iso,
        cancelled_at: null,
        client_created_at: iso,
      });
      i += 1;
    }
  }

  // A few meetings where "me" was the witness (others' meetings).
  for (let k = 0; k < 4; k++) {
    const a = peers[(k * 2) % peers.length]!;
    const b = peers[(k * 2 + 1) % peers.length]!;
    const iso = `2026-06-0${5 + (k % 2)}T${String(14 + k).padStart(2, '0')}:30:00+02:00`;
    out.push({
      id: `mock-wit-${k}`,
      initiator_username: a.username,
      initiator_camp_username: a.camp_username,
      target_username: b.username,
      target_camp_username: b.camp_username,
      witness_code: null,
      witness_code_expires_at: null,
      witness_username: me.username,
      witness_camp_username: me.camp_username,
      status: 'confirmed',
      is_hidden_by_me: false,
      created_at: iso,
      confirmed_at: iso,
      cancelled_at: null,
      client_created_at: iso,
    });
  }

  // One unconfirmed meeting to make confirmedRatio < 100% (so "Точный удар" is not earned).
  out.push({
    id: 'mock-unconf',
    initiator_username: me.username,
    initiator_camp_username: me.camp_username,
    target_username: 'ghost',
    target_camp_username: 'ghost-user',
    witness_code: null,
    witness_code_expires_at: null,
    witness_username: null,
    witness_camp_username: null,
    status: 'unconfirmed',
    is_hidden_by_me: false,
    created_at: '2026-06-07T20:00:00+02:00',
    confirmed_at: null,
    cancelled_at: null,
    client_created_at: '2026-06-07T20:00:00+02:00',
  });

  return out;
}

export const mockMeetings: Meeting[] = buildMockMeetings();

export const mockStats: RecapStats = {
  median: 6,
  mean: 7.3,
  p25: 3,
  p75: 11,
  p90: 18,
  total_participants: 142,
  total_meetings: 521,
  global_achievements: {
    first_meeting: {
      initiator: {
        username: 'kate',
        camp_username: 'wild-kate',
        display_name: 'Катя',
        avatar_url: null,
      },
      target: {
        username: 'oleg',
        camp_username: 'brave-oleg',
        display_name: 'Олег',
        avatar_url: null,
      },
      confirmed_at: '2026-06-04T10:05:00+02:00',
    },
    top_networker: {
      username: 'alice',
      camp_username: 'merry-alice',
      display_name: 'Алиса',
      avatar_url: null,
      count: 31,
    },
    top_witness: {
      username: 'm0rtyn',
      camp_username: 'jovial-martyn',
      display_name: 'Мартын',
      avatar_url: null,
      count: 12,
    },
  },
};

export const mockMyRank = 6;

/** display_name lookup table for the export-profiles section. */
export const mockDisplayNames: Map<string, string> = new Map(
  peers.map((p) => [p.username, p.display_name]),
);

/**
 * Mock camp-wide contact graph: 60 anonymous extra participants + the named peers
 * + the current user. Each node has a few random edges so the graph looks dense
 * and force-directed layout has something to chew on.
 */
function buildMockGraph(): RecapGraph {
  const nodes: RecapGraph['nodes'] = [
    { username: mockUser.username, camp_username: mockUser.camp_username },
    ...peers.map((p) => ({ username: p.username, camp_username: p.camp_username })),
  ];

  // Add anonymous extras to look like a real ~80-person camp.
  for (let i = 0; i < 60; i++) {
    nodes.push({ username: `user_${i + 1}`, camp_username: `anon-${i + 1}` });
  }

  // Deterministic pseudo-random pairing.
  let s = 1337;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };

  const edgeSet = new Set<string>();
  const edges: RecapGraph['edges'] = [];
  const addEdge = (a: string, b: string) => {
    if (a === b) return;
    const key = [a, b].sort().join('|');
    if (edgeSet.has(key)) return;
    edgeSet.add(key);
    edges.push({ a, b });
  };

  // Ensure "me" connects to all named peers (mirrors mockMeetings).
  for (const p of peers) addEdge(mockUser.username, p.username);

  // Sprinkle random extra edges so most nodes have 2–6 contacts.
  for (const node of nodes) {
    const targetDegree = 2 + Math.floor(rand() * 5);
    for (let k = 0; k < targetDegree; k++) {
      const other = nodes[Math.floor(rand() * nodes.length)]!;
      addEdge(node.username, other.username);
    }
  }

  return { nodes, edges };
}

export const mockGraph: RecapGraph = buildMockGraph();
