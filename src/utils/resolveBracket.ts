import { useTeamTranslations } from '../i18n/ui';

type StandingsGroup = {
  group: string;
  teams: Array<{ name: string; mp: number; position?: number }>;
};

type KnockoutResult = {
  stage: string;
  homeTeam: string;
  awayTeam: string;
  status: string;
  winner: string | null;
};

type BracketMatch = {
  id: string;
  round: string;
  slotA: any;
  slotB: any;
};

export type ResolvedSlot = {
  // Final display text — either a real team name, or a placeholder
  // describing which slot this is (e.g. "E組第一" or "最佳第三名：A/B/C/D/F").
  label: string;
  // Set only once the real team occupying this slot is known.
  teamName: string | null;
};

const groupLetter = (group: string) => group.replace('Group ', '');

// Finds the football-data.org fixture two given teams played each other in
// (any knockout stage) — used to find the winner of a winnerOf/loserOf
// reference once both sides of that match are known.
function findFixture(results: KnockoutResult[], teamA: string, teamB: string) {
  return results.find(r =>
    (r.homeTeam === teamA && r.awayTeam === teamB) ||
    (r.homeTeam === teamB && r.awayTeam === teamA)
  );
}

// Resolves a single slot. thirdWildcard and winnerOf/loserOf slots need to
// know what's on the OTHER side of their own match (to look up the real
// fixture or result), so this recurses rather than handling each slot in
// total isolation — knockoutResults (sourced from football-data.org, which
// publishes the full bracket draw progressively as each round is decided)
// is the persistent source of truth for both "who's the wildcard" and
// "who actually won," replacing the old approach of scanning the live odds
// feed (which drops a fixture the moment it's no longer upcoming).
function resolveSlotInternal(
  slot: any,
  standingsData: StandingsGroup[],
  knockoutResults: KnockoutResult[],
  bracketMatches: BracketMatch[],
  lang: string,
  tTeam: (name: string) => string
): ResolvedSlot {
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
    const ownMatch = bracketMatches.find(m => m.slotA === slot || m.slotB === slot);
    if (ownMatch) {
      const sibling = ownMatch.slotA === slot ? ownMatch.slotB : ownMatch.slotA;
      const siblingResolved = resolveSlotInternal(sibling, standingsData, knockoutResults, bracketMatches, lang, tTeam);
      if (siblingResolved.teamName) {
        const fixture = knockoutResults.find(r =>
          r.stage === 'LAST_32' && (r.homeTeam === siblingResolved.teamName || r.awayTeam === siblingResolved.teamName)
        );
        if (fixture) {
          const teamName = fixture.homeTeam === siblingResolved.teamName ? fixture.awayTeam : fixture.homeTeam;
          return { label: tTeam(teamName), teamName };
        }
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
    const referencedMatch = bracketMatches.find(m => m.id === slot.matchId);
    const tbd = lang === 'zh-tw' ? '待定' : lang === 'th' ? 'รอผล' : 'TBD';
    if (!referencedMatch) return { label: tbd, teamName: null };

    const refA = resolveSlotInternal(referencedMatch.slotA, standingsData, knockoutResults, bracketMatches, lang, tTeam);
    const refB = resolveSlotInternal(referencedMatch.slotB, standingsData, knockoutResults, bracketMatches, lang, tTeam);
    if (refA.teamName && refB.teamName) {
      const fixture = findFixture(knockoutResults, refA.teamName, refB.teamName);
      if (fixture?.winner) {
        const teamName = slot.type === 'winnerOf'
          ? fixture.winner
          : (fixture.winner === refA.teamName ? refB.teamName : refA.teamName);
        return { label: tTeam(teamName), teamName };
      }
    }
    return { label: tbd, teamName: null };
  }

  return { label: '?', teamName: null };
}

export function resolveMatchSlots(
  match: BracketMatch,
  standingsData: StandingsGroup[],
  knockoutResults: KnockoutResult[],
  bracketMatches: BracketMatch[],
  lang: string
) {
  const tTeam = useTeamTranslations(lang as any);
  const slotA = resolveSlotInternal(match.slotA, standingsData, knockoutResults, bracketMatches, lang, tTeam);
  const slotB = resolveSlotInternal(match.slotB, standingsData, knockoutResults, bracketMatches, lang, tTeam);
  return { slotA, slotB };
}
