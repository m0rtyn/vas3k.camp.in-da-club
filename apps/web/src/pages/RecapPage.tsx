import { useEffect, useMemo, useState } from 'react';
import {
  CAMP_END_DATE,
  CAMP_TIMEZONE,
  isCampOver,
  type LeaderboardEntry,
  type Meeting,
  type RecapGraph,
  type RecapStats,
} from '@vklube/shared';
import { AuthGuard } from '../components/AuthGuard';
import { useAuthStore } from '../store/auth';
import { useMeetingsStore } from '../store/meetings';
import { api } from '../lib/api';
import {
  getConfirmedMeetings,
  getTimelineCumulative,
  getUniquePeopleMet,
  getWitnessedMeetings,
  type RecapContext,
} from '../lib/recap/selectors';
import { buildLocalEgoGraph } from '../lib/recap/graphLayout';
import { computeFunStats } from '../lib/recap/funStats';
import { evaluateAchievements } from '../lib/recap/achievements';
import { buildProfilesList } from '../lib/recap/exportProfiles';
import { RecapHero } from '../components/recap/RecapHero';
import { RecapContactGraph } from '../components/recap/RecapContactGraph';
import { RecapComparison } from '../components/recap/RecapComparison';
import { RecapTimeline } from '../components/recap/RecapTimeline';
import { RecapAchievements } from '../components/recap/RecapAchievements';
import { RecapFunStats } from '../components/recap/RecapFunStats';
import { RecapExport } from '../components/recap/RecapExport';
import styles from './RecapPage.module.css';

export function RecapPage() {
  const campOver = isCampOver();

  if (!campOver) {
    return <CampNotOver />;
  }

  return (
    <AuthGuard>
      <RecapContent />
    </AuthGuard>
  );
}

function CampNotOver() {
  // Show a friendly stub instead of redirecting — gives users info about when it opens.
  const opensAt = new Date(CAMP_END_DATE).toLocaleString('ru-RU', {
    timeZone: CAMP_TIMEZONE,
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    <div className={styles.locked}>
      <div className={styles.lockedEmoji}>🔒</div>
      <h1 className={styles.lockedTitle}>Итоги откроются после кэмпа</h1>
      <p className={styles.lockedText}>
        Страница станет доступна {opensAt}. До тех пор — копи больше знакомств!
      </p>
    </div>
  );
}

function RecapContent() {
  const { user } = useAuthStore();
  const { meetings, fetchMeetings, isLoading: meetingsLoading } = useMeetingsStore();
  const [stats, setStats] = useState<RecapStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [graphData, setGraphData] = useState<RecapGraph | null>(null);
  const [witnessedMeetings, setWitnessedMeetings] = useState<Meeting[]>([]);
  const [displayNames, setDisplayNames] = useState<Map<string, string>>(() => new Map());
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [myRank, setMyRank] = useState<number | null>(null);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  useEffect(() => {
    let cancelled = false;
    const loadStats = async () => {
      try {
        const data = await api.get<RecapStats>('/recap/stats');
        if (!cancelled) setStats(data);
      } catch {
        if (!cancelled) setStats(null);
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    };
    const loadGraph = async () => {
      try {
        const data = await api.get<RecapGraph>('/recap/graph');
        if (!cancelled) setGraphData(data);
      } catch {
        /* fall back to local ego graph */
      }
    };
    const loadProfiles = async () => {
      try {
        const data = await api.get<{ profiles: { username: string; display_name: string }[] }>(
          '/recap/profiles',
        );
        if (!cancelled) {
          setDisplayNames(new Map(data.profiles.map((p) => [p.username, p.display_name])));
        }
      } catch {
        /* fall back to @username in export */
      }
    };
    const loadWitnessed = async () => {
      // GET /api/meetings only returns meetings where user is initiator/target.
      // Witness-only meetings live in /api/meetings/witnessed — fetch them
      // separately so the recap hero/funStats can count свидетельства.
      try {
        const data = await api.get<Meeting[]>('/meetings/witnessed');
        if (!cancelled) setWitnessedMeetings(data);
      } catch {
        /* ignore — hero will show 0, same as before */
      }
    };
    if (navigator.onLine) {
      loadStats();
      loadGraph();
      loadProfiles();
      loadWitnessed();
    } else {
      setStatsLoading(false);
    }

    const goOnline = () => {
      setIsOffline(false);
      loadStats();
      loadGraph();
      loadProfiles();
      loadWitnessed();
    };
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      cancelled = true;
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!navigator.onLine) return;
    api
      .get<LeaderboardEntry[]>('/leaderboard')
      .then((entries) => {
        if (cancelled) return;
        const me = entries.find((e) => e.is_self);
        setMyRank(me?.rank ?? null);
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const ctx: RecapContext | null = useMemo(() => {
    if (!user) return null;
    // Merge witness-only meetings (not stored in useMeetingsStore) with the
    // user's own meetings, deduping by id so selectors can count свидетельства.
    if (witnessedMeetings.length === 0) {
      return { meetings, currentUser: user };
    }
    const seen = new Set(meetings.map((m) => m.id));
    const merged = [...meetings];
    for (const w of witnessedMeetings) {
      if (!seen.has(w.id)) merged.push(w);
    }
    return { meetings: merged, currentUser: user };
  }, [meetings, witnessedMeetings, user]);

  if (!user || !ctx) return null;

  if (meetingsLoading && meetings.length === 0) {
    return <div className={styles.loading}>Готовим твои итоги…</div>;
  }

  const confirmed = getConfirmedMeetings(ctx);
  const unique = getUniquePeopleMet(ctx);
  const witnessed = getWitnessedMeetings(ctx);
  const timeline = getTimelineCumulative(ctx, CAMP_TIMEZONE);
  const graph = graphData ?? buildLocalEgoGraph(meetings, user);
  const isLocalGraph = !graphData;
  const funStats = computeFunStats(ctx);
  const achievements = evaluateAchievements({
    ...ctx,
    globalStats: stats,
    myRank,
  });
  const profiles = buildProfilesList({
    meetings,
    currentUser: user,
    displayNames,
  });

  return (
    <div className={styles.page}>
      <RecapHero
        displayName={user.display_name}
        totalConfirmed={confirmed.length}
        uniquePeople={unique.length}
        witnessedCount={witnessed.length}
      />

      <RecapContactGraph
        graph={graph}
        meId={user.username}
        isLocalFallback={isLocalGraph}
      />

      <RecapComparison
        myCount={confirmed.length}
        stats={stats}
        isLoading={statsLoading}
        isOffline={isOffline}
      />

      <RecapTimeline points={timeline} />

      <RecapAchievements achievements={achievements} />

      <RecapFunStats stats={funStats} />

      <RecapExport profiles={profiles} />
    </div>
  );
}
