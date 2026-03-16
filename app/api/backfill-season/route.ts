// @ts-nocheck
import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { rapidApiRequest, buildPlayerPicksData, buildWinnersData, saveResults } from '../../lib/tournament';

// Tournament IDs that have already completed — add any missing ones here
const COMPLETED_TOURNEY_IDS = ['011'];
const YEAR = '2026';

export async function GET() {
  const results = [];
  const users = (await sql`SELECT * FROM users;`).rows;

  for (const tourneyId of COMPLETED_TOURNEY_IDS) {
    try {
      const tournament = `${tourneyId}-${YEAR}`;

      const [picksSql, tourneyDataResponse] = await Promise.all([
        sql`SELECT * FROM picks WHERE tournament=${tournament};`,
        rapidApiRequest(tourneyId, YEAR),
      ]);

      const tourneyData = tourneyDataResponse?.data;

      if (tourneyData?.status !== 'Official') {
        results.push({ tourneyId, status: 'skipped', reason: `not official (${tourneyData?.status})` });
        continue;
      }

      if (!picksSql.rows.length) {
        results.push({ tourneyId, status: 'skipped', reason: 'no picks found in DB' });
        continue;
      }

      const playerPicksData = buildPlayerPicksData(users, picksSql.rows, tourneyData.leaderboardRows);
      const winnersData = buildWinnersData(playerPicksData, tourneyData);
      const points = await saveResults(tourneyId, YEAR, playerPicksData, winnersData);

      results.push({ tourneyId, status: 'saved', points });
    } catch (err) {
      results.push({ tourneyId, status: 'error', error: String(err) });
    }
  }

  return NextResponse.json({ results }, { status: 200 });
}
