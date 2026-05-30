import { CAMP_TIMEZONE } from '@vklube/shared';
import {
  getConfirmedMeetings,
  getTimelineCumulative,
  getUniquePeopleMet,
  getWitnessedMeetings,
  type RecapContext,
} from '../lib/recap/selectors';
import { computeFunStats } from '../lib/recap/funStats';
import { evaluateAchievements } from '../lib/recap/achievements';
import { buildProfilesMarkdown } from '../lib/recap/exportProfiles';
import {
  mockDisplayNames,
  mockGraph,
  mockMeetings,
  mockMyRank,
  mockStats,
  mockUser,
} from '../lib/recap/mockData';
import { RecapHero } from '../components/recap/RecapHero';
import { RecapContactGraph } from '../components/recap/RecapContactGraph';
import { RecapComparison } from '../components/recap/RecapComparison';
import { RecapTimeline } from '../components/recap/RecapTimeline';
import { RecapAchievements } from '../components/recap/RecapAchievements';
import { RecapFunStats } from '../components/recap/RecapFunStats';
import { RecapExport } from '../components/recap/RecapExport';
import pageStyles from './RecapPage.module.css';
import styles from './RecapPreviewPage.module.css';

/**
 * Preview page rendered with mock data — for design/feedback purposes.
 * Bypasses auth and camp-end gating. Route: /recap/preview
 */
export function RecapPreviewPage() {
  const ctx: RecapContext = {
    meetings: mockMeetings,
    currentUser: mockUser,
  };

  const confirmed = getConfirmedMeetings(ctx);
  const unique = getUniquePeopleMet(ctx);
  const witnessed = getWitnessedMeetings(ctx);
  const timeline = getTimelineCumulative(ctx, CAMP_TIMEZONE);
  const funStats = computeFunStats(ctx);
  const achievements = evaluateAchievements({
    ...ctx,
    globalStats: mockStats,
    myRank: mockMyRank,
  });
  const markdown = buildProfilesMarkdown({
    meetings: mockMeetings,
    currentUser: mockUser,
    displayNames: mockDisplayNames,
  });

  return (
    <div className={pageStyles.page}>
      <div className={styles.banner}>
        🧪 Превью с моковыми данными. Доступно всем, без авторизации.
      </div>

      <RecapHero
        displayName={mockUser.display_name}
        totalConfirmed={confirmed.length}
        uniquePeople={unique.length}
        witnessedCount={witnessed.length}
      />

      <RecapContactGraph graph={mockGraph} meId={mockUser.username} isLocalFallback={false} />

      <RecapComparison
        myCount={confirmed.length}
        stats={mockStats}
        isLoading={false}
        isOffline={false}
      />

      <RecapTimeline points={timeline} />

      <RecapAchievements achievements={achievements} />

      <RecapFunStats stats={funStats} />

      <RecapExport markdown={markdown} count={unique.length} />
    </div>
  );
}
