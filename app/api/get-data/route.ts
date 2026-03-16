// @ts-nocheck
import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { currentTourneyId } from '../../constants';
import { rapidApiRequest, buildPlayerPicksData, buildWinnersData, saveResults } from '../../lib/tournament';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const tourneyIdToGet = body?.tourneyId || currentTourneyId;
    const currentYear = '2026';
    const tourneyId = `${tourneyIdToGet}-${currentYear}`;

    const [picksSql, usersSql, tourneyDataResponse] = await Promise.all([
      sql`SELECT * FROM picks WHERE tournament=${tourneyId};`,
      sql`SELECT * FROM users;`,
      rapidApiRequest(tourneyIdToGet, currentYear),
    ]);

    const tourneyData = tourneyDataResponse?.data;
    const playerPicksData = buildPlayerPicksData(usersSql.rows, picksSql.rows, tourneyData?.leaderboardRows);
    const winnersData = buildWinnersData(playerPicksData, tourneyData);

    // Auto-save when tournament is official (idempotent upsert)
    if (tourneyData?.status === 'Official') {
      await saveResults(tourneyIdToGet, currentYear, playerPicksData, winnersData);
    }

    return NextResponse.json({ playerPicksData, winnersData }, { status: 200 });
  } catch (error) {
    console.log({ error });
    return NextResponse.json({ error }, { status: 500 });
  }
}
