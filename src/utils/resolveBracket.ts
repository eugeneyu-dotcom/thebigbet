import { useTeamTranslations } from '../i18n/ui';

type StandingsGroup = {
  group: string;
  teams: Array<{ name: string; mp: number; position?: number }>;
};

export type ResolvedSlot = {
  // Final display text — either a real team name, or a placeholder
  // describing which slot this is (e.g. "E組第一" or "最佳第三名：A/B/C/D/F").
  label: string;
  // Set only once the real team occupying this slot is known.
  teamName: string | null;
};

const groupLetter = (group: string) => group.replace('Group ', '');

// FIFA's slot-assignment table for "which of the 8 qualifying third-placed
// groups goes into which bracket slot" isn't reproduced here — it's a large
// reference table tied to the exact combination of 8 groups that qualify,
// which won't be known until the group stage finishes. Rather than
// reconstruct that table, once the actual fixture is published (in
// matches.json, sourced from the live odds feed), we just read the real
// opponent off of it directly: a thirdWildcard slot's match partner is
// already a confirmed, fixed team, so look up the fixture containing that
// team and take the other side.
export function resolveSlot(
  slot: any,
  standingsData: StandingsGroup[],
  lang: string,
  opponentTeamName?: string | null,
  liveMatches?: Array<{ home_team: string; away_team: string }>
): ResolvedSlot {
  const tTeam = useTeamTranslations(lang as any);

  if (slot.type === 'position') {
    const group = standingsData.find(g => g.group === slot.group);
    const finished = group && group.teams.every(t => t.mp === 3);
    if (group && finished) {
      const team = group.teams.find((t: any) => t.position === slot.position);
      if (team) return { label: tTeam(team.name), teamName: team.name };
    }
    const ordinal = slot.position === 1
      ? (lang === 'zh-tw' ? '第一' : lang === 'th' ? 'อันดับ 1' : '1st')
      : (lang === 'zh-tw' ? '第二' : lang === 'th' ? 'อันดับ 2' : '2nd');
    const letter = groupLetter(slot.group);
    const label = lang === 'zh-tw'
      ? `${letter}組${ordinal}`
      : lang === 'th'
        ? `กลุ่ม ${letter} ${ordinal}`
        : `Group ${letter} ${ordinal}`;
    return { label, teamName: null };
  }

  if (slot.type === 'thirdWildcard') {
    if (opponentTeamName && liveMatches) {
      const fixture = liveMatches.find(m =>
        m.home_team === opponentTeamName || m.away_team === opponentTeamName
      );
      if (fixture) {
        const teamName = fixture.home_team === opponentTeamName ? fixture.away_team : fixture.home_team;
        return { label: tTeam(teamName), teamName };
      }
    }
    const letters = slot.groups.map(groupLetter).join('/');
    const label = lang === 'zh-tw'
      ? `最佳第三名：${letters}`
      : lang === 'th'
        ? `อันดับ 3 ที่ดีที่สุด: ${letters}`
        : `Best 3rd: ${letters}`;
    return { label, teamName: null };
  }

  if (slot.type === 'winnerOf' || slot.type === 'loserOf') {
    // The knockout rounds haven't been played yet, so there's no result to
    // chase through the chain — just show a pending placeholder.
    const tbd = lang === 'zh-tw' ? '待定' : lang === 'th' ? 'รอผล' : 'TBD';
    return { label: tbd, teamName: null };
  }

  return { label: '?', teamName: null };
}
