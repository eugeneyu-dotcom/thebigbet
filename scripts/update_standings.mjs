import fs from 'fs';
import path from 'path';

// Retrieve the API key from the environment.
const FOOTBALL_DATA_ORG_TOKEN = process.env.FOOTBALL_DATA_ORG_TOKEN;

if (!FOOTBALL_DATA_ORG_TOKEN) {
  console.error("❌ Error: FOOTBALL_DATA_ORG_TOKEN is not set in the environment.");
  process.exit(1);
}

const standingsPath = path.resolve('src/data/worldCupStandings.json');
const thirdPlacePath = path.resolve('src/data/thirdPlaceStandings.json');
const matchesPath = path.resolve('src/data/matches.json');

// Looks up who won the head-to-head between two teams — either from real
// results already played (h2h lookup), or, if their meeting is one of the
// matches being simulated in this scenario, from that simulated result.
// Returns the winner's name, "DRAW", or null if genuinely unknown.
function getHeadToHeadWinner(nameA, nameB, h2hResults, scenarioMatchResults) {
  const simulated = scenarioMatchResults.find(m =>
    (m.home_team === nameA && m.away_team === nameB) ||
    (m.home_team === nameB && m.away_team === nameA)
  );
  if (simulated) {
    if (simulated.winner === 'DRAW') return 'DRAW';
    return simulated.winner;
  }
  const key1 = `${nameA}|${nameB}`;
  const key2 = `${nameB}|${nameA}`;
  if (h2hResults[key1] !== undefined) return h2hResults[key1];
  if (h2hResults[key2] !== undefined) return h2hResults[key2];
  return null;
}

// Brute-force every possible result of a group's remaining matches to find
// statuses that are *mathematically certain* before the group has finished:
//   - "qualified": guaranteed top-2 finish in every single scenario
//   - "eliminated": guaranteed LAST place in every single scenario (meaning
//      they can't even be a 3rd-place wildcard candidate)
// Anything else (including "could finish 3rd in some scenarios") stays
// "active" — deliberately conservative, since overall goal-difference
// tiebreaks (as opposed to head-to-head, which we do account for) can't be
// predicted in advance.
//
// Tiebreaker note: this World Cup ranks teams level on points by their
// head-to-head record FIRST, before overall goal difference. When two teams
// are tied, we resolve it via head-to-head if decisive; if the head-to-head
// was a draw (or hasn't happened and isn't part of this scenario, which
// shouldn't occur in a single round-robin group), we treat it as genuinely
// ambiguous — pessimistically (counted as "above") for the qualified check,
// optimistically (not counted as "above") for the eliminated check.
function resolveCertainStatuses(teams, remainingMatches, h2hResults) {
  if (remainingMatches.length === 0) return;

  const outcomesPerMatch = [
    { homePts: 3, awayPts: 0, winner: 'home' }, // home win
    { homePts: 1, awayPts: 1, winner: 'DRAW' },  // draw
    { homePts: 0, awayPts: 3, winner: 'away' },  // away win
  ];

  // Cartesian product of outcomes across all remaining matches in this group.
  let scenarios = [[]];
  for (const match of remainingMatches) {
    const next = [];
    for (const partial of scenarios) {
      for (const outcome of outcomesPerMatch) {
        next.push([...partial, outcome]);
      }
    }
    scenarios = next;
  }

  const worstNumAbove = {}; // highest (worst) numAbove seen per team, pessimistic ties
  const bestNumAbove = {};  // lowest (best) numAbove seen per team, optimistic ties
  teams.forEach(t => {
    worstNumAbove[t.name] = -Infinity;
    bestNumAbove[t.name] = Infinity;
  });

  for (const scenario of scenarios) {
    const finalPts = {};
    teams.forEach(t => { finalPts[t.name] = t.pts; });

    const scenarioMatchResults = remainingMatches.map((match, i) => {
      const outcome = scenario[i];
      finalPts[match.home_team] += outcome.homePts;
      finalPts[match.away_team] += outcome.awayPts;
      const winner = outcome.winner === 'home' ? match.home_team
        : outcome.winner === 'away' ? match.away_team
        : 'DRAW';
      return { home_team: match.home_team, away_team: match.away_team, winner };
    });

    teams.forEach(t => {
      let numAbovePessimistic = 0;
      let numAboveOptimistic = 0;

      teams.forEach(o => {
        if (o.name === t.name) return;
        if (finalPts[o.name] > finalPts[t.name]) {
          numAbovePessimistic++;
          numAboveOptimistic++;
          return;
        }
        if (finalPts[o.name] < finalPts[t.name]) return;

        // Tied on points — fall back to head-to-head.
        const h2hWinner = getHeadToHeadWinner(t.name, o.name, h2hResults, scenarioMatchResults);
        if (h2hWinner === o.name) {
          numAbovePessimistic++;
          numAboveOptimistic++;
        } else if (h2hWinner === t.name) {
          // o is decisively NOT above t — counts toward neither.
        } else {
          // Drawn or unknown head-to-head: ambiguous.
          numAbovePessimistic++;
        }
      });

      worstNumAbove[t.name] = Math.max(worstNumAbove[t.name], numAbovePessimistic);
      bestNumAbove[t.name] = Math.min(bestNumAbove[t.name], numAboveOptimistic);
    });
  }

  teams.forEach(t => {
    if (worstNumAbove[t.name] <= 1) t.status = "qualified";       // never more than 1 team above, even pessimistically
    else if (bestNumAbove[t.name] >= 3) t.status = "eliminated";  // always last, even optimistically
    // else: stays "active" — still genuinely undetermined
  });
}

// Returns the [min, max] points the team that ends up 3rd-in-group could
// possibly finish with, across every outcome of the group's remaining
// matches. Used to judge the cross-group "best 8 of 12 third-placed teams"
// race before every group has finished.
//
// Deliberately points-only: goal difference/goals scored are unbounded by
// any remaining-match simulation (a team could theoretically win 10-0), so
// there's no rigorous way to bound them in advance. A team is only ever
// declared certain here if it can't be caught (or overtaken) on points
// alone — ties on points are resolved by the exact, GD-aware ranking pass
// once every group has actually finished.
function computeThirdPlacePointsBounds(teams, remainingMatches) {
  if (remainingMatches.length === 0) {
    const sortedPts = teams.map(t => t.pts).sort((a, b) => b - a);
    return { min: sortedPts[2], max: sortedPts[2] };
  }

  const outcomes = [
    { home: 3, away: 0 },
    { home: 1, away: 1 },
    { home: 0, away: 3 },
  ];

  let scenarios = [[]];
  for (let i = 0; i < remainingMatches.length; i++) {
    const next = [];
    for (const partial of scenarios) {
      for (const outcome of outcomes) {
        next.push([...partial, outcome]);
      }
    }
    scenarios = next;
  }

  let min = Infinity;
  let max = -Infinity;
  for (const scenario of scenarios) {
    const finalPts = {};
    teams.forEach(t => { finalPts[t.name] = t.pts; });
    remainingMatches.forEach((match, i) => {
      finalPts[match.home_team] += scenario[i].home;
      finalPts[match.away_team] += scenario[i].away;
    });
    const sortedPts = Object.values(finalPts).sort((a, b) => b - a);
    const thirdPlacePts = sortedPts[2];
    min = Math.min(min, thirdPlacePts);
    max = Math.max(max, thirdPlacePts);
  }
  return { min, max };
}

// Mapping dictionary to align football-data.org names with The-Odds-API / UI dictionary names
const teamNameMap = {
  "United States": "USA",
  "Korea Republic": "South Korea",
  "Czechia": "Czech Republic",
  "Bosnia-Herzegovina": "Bosnia & Herzegovina",
  "Congo DR": "DR Congo",
  "Cape Verde Islands": "Cape Verde"
};

async function main() {
  console.log("🏆 Starting Daily World Cup Standings Update via Football-Data.org...");

  try {
    // Competition 2000 is FIFA World Cup
    const response = await fetch("https://api.football-data.org/v4/competitions/WC/standings", {
      method: "GET",
      headers: {
        "X-Auth-Token": FOOTBALL_DATA_ORG_TOKEN
      }
    });

    if (!response.ok) {
      console.error(`⚠️ Failed to fetch standings from football-data.org. Status: ${response.status}`);
      process.exit(1);
    }

    const data = await response.json();
    
    if (!data.standings || data.standings.length === 0) {
      console.log("⚠️ No standings data found. Using fallback/empty state.");
      process.exit(0);
    }

    // Fetch full group-stage results so far, to build a head-to-head lookup.
    // This tournament's in-group tiebreaker is head-to-head record FIRST,
    // before overall goal difference — so this matters for figuring out
    // which teams are mathematically locked into qualification/elimination
    // before their group has finished.
    const h2hResults = {};
    const matchesResponse = await fetch("https://api.football-data.org/v4/competitions/WC/matches?status=FINISHED", {
      headers: { "X-Auth-Token": FOOTBALL_DATA_ORG_TOKEN }
    });
    if (matchesResponse.ok) {
      const matchesData = await matchesResponse.json();
      for (const m of (matchesData.matches || [])) {
        if (m.stage !== "GROUP_STAGE") continue;
        let homeName = m.homeTeam.name;
        let awayName = m.awayTeam.name;
        if (teamNameMap[homeName]) homeName = teamNameMap[homeName];
        if (teamNameMap[awayName]) awayName = teamNameMap[awayName];

        const winner = m.score.winner === 'HOME_TEAM' ? homeName
          : m.score.winner === 'AWAY_TEAM' ? awayName
          : 'DRAW';
        h2hResults[`${homeName}|${awayName}`] = winner;
      }
    } else {
      console.error(`⚠️ Failed to fetch match history for head-to-head lookups. Status: ${matchesResponse.status}`);
    }

    const formattedStandings = [];

    // football-data.org returns an array of groups in data.standings
    for (const group of data.standings) {
      // Only process TOTAL standings (ignore HOME/AWAY partials if any)
      if (group.type !== "TOTAL") continue;
      
      const groupName = group.group; // e.g. "Group A"
      if (!groupName) continue;
      
      const teams = group.table.map(teamInfo => {
        let name = teamInfo.team.name;
        // Apply name mapping if necessary
        if (teamNameMap[name]) {
          name = teamNameMap[name];
        }

        // 1st/2nd auto-qualify, 4th is eliminated, once the group's 3 matches are done.
        // 3rd place is left "active" here — its fate depends on the best-8-of-12
        // third-place ranking across ALL groups, resolved in the cross-group pass below.
        let status = "active";

        if (teamInfo.playedGames === 3) {
          if (teamInfo.position <= 2) status = "qualified";
          else if (teamInfo.position === 4) status = "eliminated";
        }

        return {
          name: name,
          mp: teamInfo.playedGames,
          w: teamInfo.won,
          d: teamInfo.draw,
          l: teamInfo.lost,
          gf: teamInfo.goalsFor,
          ga: teamInfo.goalsAgainst,
          gd: teamInfo.goalDifference,
          pts: teamInfo.points,
          position: teamInfo.position,
          status: status
        };
      });

      formattedStandings.push({
        group: groupName,
        teams: teams
      });
    }

    // For groups that haven't finished yet, check whether any team's top-2
    // (or last-place) finish is already mathematically locked in, regardless
    // of how their remaining matches play out.
    const allMatches = fs.existsSync(matchesPath)
      ? JSON.parse(fs.readFileSync(matchesPath, 'utf8'))
      : [];
    const now = new Date();

    // Per-group remaining matches, keyed by group name — computed once here
    // and reused below for the cross-group third-place bounds.
    const remainingMatchesByGroup = {};
    formattedStandings.forEach(g => {
      const names = g.teams.map(t => t.name);
      remainingMatchesByGroup[g.group] = allMatches.filter(m =>
        new Date(m.commence_time) > now &&
        names.includes(m.home_team) &&
        names.includes(m.away_team)
      );
    });

    formattedStandings.forEach(g => {
      if (g.teams.some(t => t.mp === 3)) return; // already finished, handled above
      resolveCertainStatuses(g.teams, remainingMatchesByGroup[g.group], h2hResults);
    });

    // Best-8-of-12 third place ranking. Two passes:
    //   1. A conservative, points-only certainty check that can already
    //      flag some groups' 3rd-place team as qualified/eliminated before
    //      every group has finished (see computeThirdPlacePointsBounds).
    //   2. Once every group HAS finished, an exact GD/GF-aware ranking pass
    //      that resolves any points ties the first pass had to leave "active".
    const allGroupsFinished = formattedStandings.every(g =>
      g.teams.every(t => t.mp === 3)
    );

    // For a FINISHED group, the 3rd-place team's GD/GF are settled facts, not
    // bounded guesses — so we can compare them exactly against another
    // finished group's 3rd-place team, the same way the final cross-group
    // ranking would. Only for groups still in progress do we fall back to
    // the points-only bound (GD/GF there are genuinely unbounded by any
    // remaining-match simulation).
    const groupThirdPlaceComparable = {};
    formattedStandings.forEach(g => {
      const finished = g.teams.every(t => t.mp === 3);
      if (finished) {
        const thirdTeam = g.teams.find(t => t.position === 3);
        groupThirdPlaceComparable[g.group] = { finished: true, pts: thirdTeam.pts, gd: thirdTeam.gd, gf: thirdTeam.gf };
      } else {
        groupThirdPlaceComparable[g.group] = {
          finished: false,
          ...computeThirdPlacePointsBounds(g.teams, remainingMatchesByGroup[g.group])
        };
      }
    });

    // Returns true if `other`'s 3rd-place team is definitely ranked above
    // ours (pts, then GD, then GF) — a settled fact for a finished group,
    // impossible to assert for an unfinished one beyond points alone.
    function isDefinitelyAbove(other, ours) {
      if (other.finished) {
        if (other.pts !== ours.pts) return other.pts > ours.pts;
        if (other.gd !== ours.gd) return other.gd > ours.gd;
        if (other.gf !== ours.gf) return other.gf > ours.gf;
        return false; // exact tie even on GF — would need fair-play/FIFA ranking, leave ambiguous
      }
      return other.min > ours.pts;
    }

    // Returns true if `other` could plausibly end up ranked above or tied
    // with ours — the pessimistic check used for the "qualified" guarantee.
    function mightBeAboveOrTied(other, ours) {
      if (other.finished) {
        if (other.pts !== ours.pts) return other.pts > ours.pts;
        if (other.gd !== ours.gd) return other.gd > ours.gd;
        if (other.gf !== ours.gf) return other.gf > ours.gf;
        return true; // exact tie on pts/GD/GF — ambiguous, count pessimistically
      }
      return other.max >= ours.pts;
    }

    formattedStandings.forEach(g => {
      if (!g.teams.every(t => t.mp === 3)) return; // identity of "3rd place" isn't settled yet
      const thirdTeam = g.teams.find(t => t.position === 3);
      if (!thirdTeam) return;
      const ours = { pts: thirdTeam.pts, gd: thirdTeam.gd, gf: thirdTeam.gf };

      let numAbovePessimistic = 0;
      let numAboveGuaranteed = 0;
      Object.entries(groupThirdPlaceComparable).forEach(([otherGroup, other]) => {
        if (otherGroup === g.group) return;
        if (mightBeAboveOrTied(other, ours)) numAbovePessimistic++;
        if (isDefinitelyAbove(other, ours)) numAboveGuaranteed++;
      });

      if (numAbovePessimistic <= 7) thirdTeam.status = "qualified";
      else if (numAboveGuaranteed >= 8) thirdTeam.status = "eliminated";
      // else: stays "active" — still genuinely undetermined
    });

    if (allGroupsFinished) {
      const thirdPlaceTeams = formattedStandings
        .map(g => g.teams.find(t => t.position === 3))
        .filter(Boolean)
        .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);

      thirdPlaceTeams.forEach((team, idx) => {
        team.status = idx < 8 ? "qualified" : "eliminated";
      });
    }

    // Snapshot the current 3rd-place team per group for the homepage's
    // cross-group ranking table, before the internal `position` field
    // (needed to identify "3rd place") is stripped below.
    const thirdPlaceStandings = formattedStandings
      .map(g => {
        const thirdTeam = g.teams.find(t => t.position === 3);
        if (!thirdTeam) return null;
        return { group: g.group, ...thirdTeam };
      })
      .filter(Boolean)
      .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
    thirdPlaceStandings.forEach(t => delete t.position);

    // `position` is kept on each team — it's football-data.org's official
    // rank within the group (head-to-head-aware), which the knockout bracket
    // page relies on to resolve "Group X winner/runner-up" slots correctly.

    fs.writeFileSync(standingsPath, JSON.stringify(formattedStandings, null, 2), 'utf8');
    fs.writeFileSync(thirdPlacePath, JSON.stringify(thirdPlaceStandings, null, 2), 'utf8');
    console.log(`✅ Successfully updated worldCupStandings.json with ${formattedStandings.length} groups.`);
    console.log(`✅ Successfully updated thirdPlaceStandings.json with ${thirdPlaceStandings.length} teams.`);

  } catch (e) {
    console.error(`⚠️ Exception during standings update:`, e);
  }
}

main();
