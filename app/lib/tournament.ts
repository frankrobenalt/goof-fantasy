// @ts-nocheck
import { sql } from '@vercel/postgres';
import axios from 'axios';

export const rapidApiRequest = (tourneyId: string, year: string) =>
  axios.request({
    method: 'GET',
    url: 'https://live-golf-data.p.rapidapi.com/leaderboard',
    headers: {
      'X-RapidAPI-Key': process.env.NEXT_PUBLIC_RAPID_API_KEY,
      'X-RapidAPI-Host': 'live-golf-data.p.rapidapi.com',
    },
    params: { orgId: '1', tournId: tourneyId, year },
  });

const getAllLowPicks = (playerPicksData, lowPicks, pickIdsToIgnore, roundKey) => {
  const winningPickUserId = lowPicks[0].user_id;
  const playerPicks = playerPicksData.find(p => p.user_id === winningPickUserId);
  const winningPicks = playerPicks.picks.filter(
    pick =>
      lowPicks.some(lp => pick.pick_id === lp.pick.pick_id) ||
      pickIdsToIgnore.some(id => id === pick.pick_id)
  );
  return winningPicks
    .map(pick => ({ name: playerPicks.name, username: playerPicks.username, user_id: playerPicks.user_id, pick }))
    .sort((a, b) => a.pick[roundKey] - b.pick[roundKey]);
};

export const calculateLowRound = (playerPicksData, roundKey, pickIdsToIgnore = [], userIdsToIgnore = []) => {
  let currentLow = 1000;
  let currentLowPicks = [];

  playerPicksData
    .filter(p => userIdsToIgnore.every(id => id !== p.user_id))
    .forEach(player => {
      player.picks.forEach(pick => {
        if (!pick[roundKey] || pickIdsToIgnore.some(id => id === pick.pick_id)) return;
        if (pick[roundKey] === currentLow) {
          currentLowPicks = [...currentLowPicks, { pick, user_id: player.user_id, name: player.name, username: player.username }];
        }
        if (pick[roundKey] < currentLow) {
          currentLow = pick[roundKey];
          currentLowPicks = [{ pick, user_id: player.user_id, name: player.name, username: player.username }];
        }
      });
    });

  if (currentLowPicks.length === 0) return null;
  if (currentLowPicks.length === 1) return getAllLowPicks(playerPicksData, currentLowPicks, pickIdsToIgnore, roundKey);

  const countPerUser = {};
  currentLowPicks.forEach(lp => { countPerUser[lp.user_id] = (countPerUser[lp.user_id] || 0) + 1; });

  let maxCount = 0;
  let usersWithMost = [];
  Object.keys(countPerUser).forEach(id => {
    if (countPerUser[id] === maxCount) usersWithMost.push(id);
    if (countPerUser[id] > maxCount) { maxCount = countPerUser[id]; usersWithMost = [id]; }
  });

  if (usersWithMost.length === 1) {
    return getAllLowPicks(
      playerPicksData,
      currentLowPicks.filter(lp => `${lp.user_id}` === usersWithMost[0]),
      pickIdsToIgnore,
      roundKey
    );
  }

  const playersWithoutLow = playerPicksData.filter(p => currentLowPicks.every(lp => lp.user_id !== p.user_id));
  return calculateLowRound(
    playerPicksData,
    roundKey,
    [...currentLowPicks.map(lp => lp.pick.pick_id), ...pickIdsToIgnore],
    [...new Set([...playersWithoutLow.map(p => p.user_id), ...userIdsToIgnore])]
  );
};

export function buildPlayerPicksData(users, picks, playerData) {
  return users.map(user => {
    const picksForUser = picks.filter(pick => pick.user_id === `${user.user_id}`);
    const pickStats = [];
    let lowR1 = 200, lowR2 = 200, lowR3 = 200, lowR4 = 200;

    picksForUser.forEach(pick => {
      const pd = playerData.find(p => p.playerId === pick.player_id);
      const rounds = pd?.rounds;
      const isPlayerCut = pd?.status === 'cut';
      const playerHasntStarted = pd?.status === 'between rounds' || pd?.status === 'not started';
      const holesThrough = pd?.startingHole === 10
        ? (pd?.currentHole > 9 ? pd?.currentHole - 10 : pd?.currentHole + 10)
        : (pd?.currentHole - 1);
      const holesThroughDisplay = pd?.status === 'complete'
        ? 'F'
        : (playerHasntStarted ? pd?.teeTime : holesThrough === 0 ? '' : holesThrough);

      const r1 = rounds?.[0]?.strokes;
      const r2 = rounds?.[1]?.strokes;
      const r3 = isPlayerCut ? '-' : rounds?.[2]?.strokes;
      const r4 = isPlayerCut ? '-' : rounds?.[3]?.strokes;

      if (r1 < lowR1) lowR1 = r1;
      if (r2 < lowR2) lowR2 = r2;
      if (r3 !== '-' && r3 < lowR3) lowR3 = r3;
      if (r4 !== '-' && r4 < lowR4) lowR4 = r4;

      pickStats.push({
        pick_id: pick.pick_id,
        playerId: pd?.playerId,
        name: `${pd?.firstName} ${pd?.lastName}`,
        currentRoundScore: isPlayerCut ? 'Cut' : (playerHasntStarted ? '-' : pd?.currentRoundScore),
        currentHolesThrough: isPlayerCut ? 'Cut' : holesThroughDisplay,
        total: isPlayerCut ? 'Cut' : pd?.total,
        totalConvertedForMath: pd?.total === 'E' ? 0 : (Number(pd?.total) < 0 ? Number(pd?.total) : Number(pd?.total?.slice(1))),
        round1Score: r1,
        round2Score: r2,
        round3Score: r3,
        round4Score: r4,
        totalStrokesFromCompletedRounds: pd?.totalStrokesFromCompletedRounds,
      });
    });

    const picksWithoutCut = pickStats.filter(p => p.total !== 'Cut');
    const sorted = [...picksWithoutCut].sort((a, b) => a.totalConvertedForMath - b.totalConvertedForMath);
    const topThree = sorted.length > 2
      ? sorted[0].totalConvertedForMath + sorted[1].totalConvertedForMath + sorted[2].totalConvertedForMath
      : '-';

    return {
      user_id: user.user_id,
      name: user.name,
      username: user.username,
      picks: pickStats,
      lowRoundOneScore: lowR1 === 200 ? '-' : lowR1,
      lowRoundTwoScore: lowR2 === 200 ? '-' : lowR2,
      lowRoundThreeScore: lowR3 === 200 ? '-' : lowR3,
      lowRoundFourScore: lowR4 === 200 ? '-' : lowR4,
      topThree,
    };
  });
}

export function buildWinnersData(playerPicksData, tourneyData) {
  const isComplete = tourneyData?.status === 'Official';
  const currentRound = tourneyData?.roundId;
  const roundStatus = tourneyData?.roundStatus;
  const firstPlacePlayer = tourneyData?.leaderboardRows?.[0];

  const roundOneLow   = (currentRound === 1 && roundStatus === 'In Progress') ? null : calculateLowRound(playerPicksData, 'round1Score');
  const roundTwoLow   = (currentRound === 2 && roundStatus === 'In Progress') ? null : calculateLowRound(playerPicksData, 'round2Score');
  const roundThreeLow = (currentRound === 3 && roundStatus === 'In Progress') ? null : calculateLowRound(playerPicksData, 'round3Score');
  const roundFourLow  = (currentRound === 4 && roundStatus === 'In Progress') ? null : calculateLowRound(playerPicksData, 'round4Score');

  const qualifiesForTopThree = playerPicksData.filter(p => p.topThree !== '-');
  const topThreeLow = isComplete
    ? qualifiesForTopThree.sort((a, b) => a.topThree - b.topThree)[0] ?? null
    : null;
  const pickedWinner = isComplete
    ? playerPicksData.find(p => p.picks.some(pick => pick.playerId === firstPlacePlayer?.playerId)) ?? null
    : null;

  return {
    roundOneLow,
    roundTwoLow,
    roundThreeLow,
    roundFourLow,
    topThree: topThreeLow,
    pickedWinner: pickedWinner ? { ...pickedWinner, winner: firstPlacePlayer } : null,
  };
}

export async function saveResults(tourneyId: string, year: string, playerPicksData: any[], winnersData: any) {
  const tournament = `${tourneyId}-${year}`;
  const points: Record<number, { r1: number; r2: number; r3: number; r4: number; top3: number; winner: number }> = {};

  playerPicksData.forEach(p => {
    points[p.user_id] = { r1: 0, r2: 0, r3: 0, r4: 0, top3: 0, winner: 0 };
  });

  if (winnersData.roundOneLow?.[0])   points[winnersData.roundOneLow[0].user_id].r1    = 1;
  if (winnersData.roundTwoLow?.[0])   points[winnersData.roundTwoLow[0].user_id].r2    = 1;
  if (winnersData.roundThreeLow?.[0]) points[winnersData.roundThreeLow[0].user_id].r3  = 1;
  if (winnersData.roundFourLow?.[0])  points[winnersData.roundFourLow[0].user_id].r4   = 1;
  if (winnersData.topThree)           points[winnersData.topThree.user_id].top3         = 2;
  if (winnersData.pickedWinner)       points[winnersData.pickedWinner.user_id].winner   = 2;

  for (const [userId, p] of Object.entries(points)) {
    await sql`
      INSERT INTO tournament_results
        (user_id, tournament, r1_point, r2_point, r3_point, r4_point, top3_points, winner_points)
      VALUES
        (${Number(userId)}, ${tournament}, ${p.r1}, ${p.r2}, ${p.r3}, ${p.r4}, ${p.top3}, ${p.winner})
      ON CONFLICT (user_id, tournament) DO UPDATE SET
        r1_point      = EXCLUDED.r1_point,
        r2_point      = EXCLUDED.r2_point,
        r3_point      = EXCLUDED.r3_point,
        r4_point      = EXCLUDED.r4_point,
        top3_points   = EXCLUDED.top3_points,
        winner_points = EXCLUDED.winner_points;
    `;
  }

  return points;
}
