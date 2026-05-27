import type { RecapStats } from '@vklube/shared';
import type { RecapContext } from './selectors';
import { computeFunStats } from './funStats';

export type AchievementScope = 'global' | 'personal';

export interface AchievementHolder {
  username: string;
  display_name: string;
}

export interface Achievement {
  id: string;
  emoji: string;
  title: string;
  description: string;
  scope: AchievementScope;
  /** Optional numeric/text value to display alongside the badge. */
  value?: string;
  /** For global single-winner achievements: who holds it. */
  holder?: AchievementHolder;
  /** True if the current user is the holder (or earned a personal achievement). */
  earnedByMe: boolean;
}

interface EvaluateContext extends RecapContext {
  globalStats: RecapStats | null;
  /** Current user's leaderboard rank, if known. */
  myRank?: number | null;
}

export function evaluateAchievements(ctx: EvaluateContext): Achievement[] {
  const out: Achievement[] = [];
  const me = ctx.currentUser.username;
  const stats = computeFunStats(ctx);

  // --- GLOBAL (server-provided) ---
  const g = ctx.globalStats?.global_achievements;
  if (g?.first_meeting) {
    const init = g.first_meeting.initiator;
    const targ = g.first_meeting.target;
    const earnedByMe = init.username === me || targ.username === me;
    out.push({
      id: 'first_meeting',
      emoji: '⚡',
      title: 'Есть пробитие',
      description: `Первая встреча кэмпа: ${init.display_name} ↔ ${targ.display_name}`,
      scope: 'global',
      holder: { username: init.username, display_name: init.display_name },
      earnedByMe,
    });
  }
  if (g?.top_networker) {
    out.push({
      id: 'top_networker',
      emoji: '🤖',
      title: 'Просто машина',
      description: 'Больше всего подтверждённых знакомств в кэмпе',
      scope: 'global',
      value: `${g.top_networker.count} контактов`,
      holder: {
        username: g.top_networker.username,
        display_name: g.top_networker.display_name,
      },
      earnedByMe: g.top_networker.username === me,
    });
  }
  if (g?.top_witness) {
    out.push({
      id: 'top_witness',
      emoji: '💍',
      title: 'Сваха',
      description: 'Чаще всех подтверждал чужие встречи',
      scope: 'global',
      value: `${g.top_witness.count} подтверждений`,
      holder: {
        username: g.top_witness.username,
        display_name: g.top_witness.display_name,
      },
      earnedByMe: g.top_witness.username === me,
    });
  }

  // --- PERSONAL ---
  if (ctx.myRank != null) {
    if (ctx.myRank === 1) {
      out.push({
        id: 'rank_1',
        emoji: '🥇',
        title: 'Первое место',
        description: 'Топ-1 рейтинга',
        scope: 'personal',
        value: `#${ctx.myRank}`,
        earnedByMe: true,
      });
    } else if (ctx.myRank === 2) {
      out.push({
        id: 'rank_2',
        emoji: '🥈',
        title: 'Серебро',
        description: 'Второе место в рейтинге',
        scope: 'personal',
        value: `#${ctx.myRank}`,
        earnedByMe: true,
      });
    } else if (ctx.myRank === 3) {
      out.push({
        id: 'rank_3',
        emoji: '🥉',
        title: 'Бронза',
        description: 'Третье место в рейтинге',
        scope: 'personal',
        value: `#${ctx.myRank}`,
        earnedByMe: true,
      });
    } else if (ctx.myRank <= 20) {
      out.push({
        id: 'rank_top20',
        emoji: '🏅',
        title: 'Топ-20',
        description: 'Попадание в топ-20 рейтинга',
        scope: 'personal',
        value: `#${ctx.myRank}`,
        earnedByMe: true,
      });
    }
  }

  // Социалит — пороги.
  const socialiteTiers: Array<{ count: number; emoji: string; title: string }> = [
    { count: 30, emoji: '🌐', title: 'Сетевой бог' },
    { count: 15, emoji: '🎉', title: 'Душа компании' },
    { count: 5, emoji: '🤝', title: 'Социалит' },
  ];
  for (const t of socialiteTiers) {
    if (stats.uniquePeople >= t.count) {
      out.push({
        id: `socialite_${t.count}`,
        emoji: t.emoji,
        title: t.title,
        description: `Познакомился с ${t.count}+ людьми`,
        scope: 'personal',
        value: `${stats.uniquePeople} человек`,
        earnedByMe: true,
      });
      break;
    }
  }

  // Ночная сова.
  if (stats.nightShare >= 0.3 && stats.totalConfirmed >= 3) {
    out.push({
      id: 'night_owl',
      emoji: '🌙',
      title: 'Ночная сова',
      description: 'Больше 30% встреч прошли ночью (00:00–06:00)',
      scope: 'personal',
      value: `${Math.round(stats.nightShare * 100)}%`,
      earnedByMe: true,
    });
  }

  // Свидетель — пороги.
  const witnessTiers = [
    { count: 20, emoji: '🦉', title: 'Главный свидетель' },
    { count: 10, emoji: '👁️', title: 'Опытный свидетель' },
    { count: 3, emoji: '✋', title: 'Свидетель' },
  ];
  for (const t of witnessTiers) {
    if (stats.witnessedCount >= t.count) {
      out.push({
        id: `witness_${t.count}`,
        emoji: t.emoji,
        title: t.title,
        description: `Подтвердил ${t.count}+ чужих встреч`,
        scope: 'personal',
        value: `${stats.witnessedCount} раз`,
        earnedByMe: true,
      });
      break;
    }
  }

  // На чилле — большой средний интервал.
  if (stats.avgGapHours != null && stats.avgGapHours >= 6 && stats.totalConfirmed >= 5) {
    out.push({
      id: 'chill',
      emoji: '🐢',
      title: 'На чилле',
      description: 'В среднем больше 6 часов между встречами',
      scope: 'personal',
      value: `~${Math.round(stats.avgGapHours)} ч`,
      earnedByMe: true,
    });
  }

  // Стахановец — много встреч в один день.
  if (stats.mostActiveDay && stats.mostActiveDay.count >= 5) {
    out.push({
      id: 'stakhanov',
      emoji: '⚒️',
      title: 'Стахановец',
      description: 'Пять и больше встреч за один день',
      scope: 'personal',
      value: `${stats.mostActiveDay.count} за день`,
      earnedByMe: true,
    });
  }

  // Точный удар — 100% confirmed ratio при достаточной выборке.
  if (stats.confirmedRatio === 1 && stats.totalConfirmed >= 5) {
    out.push({
      id: 'precise',
      emoji: '🎯',
      title: 'Точный удар',
      description: 'Все встречи подтверждены',
      scope: 'personal',
      value: '100%',
      earnedByMe: true,
    });
  }

  return out;
}
