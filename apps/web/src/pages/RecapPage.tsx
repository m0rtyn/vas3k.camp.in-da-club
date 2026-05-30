import { useEffect, useMemo, useState } from 'react';
import {
  CAMP_END_DATE,
  CAMP_TIMEZONE,
  isCampOver,
  type LeaderboardEntry,
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
import { buildProfilesMarkdown } from '../lib/recap/exportProfiles';
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
    if (navigator.onLine) {
      loadStats();
      loadGraph();
    } else {
      setStatsLoading(false);
    }

    const goOnline = () => {
      setIsOffline(false);
      loadStats();
      loadGraph();
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

  const ctx: RecapContext | null = useMemo(
    () => (user ? { meetings, currentUser: user } : null),
    [meetings, user],
  );

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
  const markdown = buildProfilesMarkdown({
    meetings,
    currentUser: user,
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

      <RecapExport markdown={markdown} count={unique.length} />
    </div>
  );
}
