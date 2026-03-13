// @ts-nocheck
import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

// POST { tourneyId, year?, playerPicksData, winnersData }
// Call this after a tournament is officially complete to lock in season points.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tourneyId, year = '2025', playerPicksData, winnersData } = body;

    if (!tourneyId || !playerPicksData || !winnersData) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const tournament = `${tourneyId}-${year}`;

    // Build a points map keyed by user_id
    const points: Record<number, { r1: number; r2: number; r3: number; r4: number; top3: number; winner: number }> = {};
    playerPicksData.forEach((p: any) => {
      points[p.user_id] = { r1: 0, r2: 0, r3: 0, r4: 0, top3: 0, winner: 0 };
    });

    if (winnersData.roundOneLow?.[0])   points[winnersData.roundOneLow[0].user_id].r1     = 1;
    if (winnersData.roundTwoLow?.[0])   points[winnersData.roundTwoLow[0].user_id].r2     = 1;
    if (winnersData.roundThreeLow?.[0]) points[winnersData.roundThreeLow[0].user_id].r3   = 1;
    if (winnersData.roundFourLow?.[0])  points[winnersData.roundFourLow[0].user_id].r4    = 1;
    if (winnersData.topThree)           points[winnersData.topThree.user_id].top3          = 2;
    if (winnersData.pickedWinner)       points[winnersData.pickedWinner.user_id].winner    = 2;

    for (const [userId, p] of Object.entries(points)) {
      await sql`
        INSERT INTO tournament_results
          (user_id, tournament, r1_point, r2_point, r3_point, r4_point, top3_points, winner_points)
        VALUES
          (${Number(userId)}, ${tournament}, ${p.r1}, ${p.r2}, ${p.r3}, ${p.r4}, ${p.top3}, ${p.winner})
        ON CONFLICT (user_id, tournament) DO UPDATE SET
          r1_point     = EXCLUDED.r1_point,
          r2_point     = EXCLUDED.r2_point,
          r3_point     = EXCLUDED.r3_point,
          r4_point     = EXCLUDED.r4_point,
          top3_points  = EXCLUDED.top3_points,
          winner_points = EXCLUDED.winner_points;
      `;
    }

    return NextResponse.json({ message: 'Results saved', points }, { status: 200 });
  } catch (error) {
    console.log({ error });
    return NextResponse.json({ error }, { status: 500 });
  }
}
