// @ts-nocheck
import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { rows } = await sql`
      SELECT
        tr.user_id,
        u.name,
        u.username,
        tr.tournament,
        tr.r1_point,
        tr.r2_point,
        tr.r3_point,
        tr.r4_point,
        tr.top3_points,
        tr.winner_points,
        (tr.r1_point + tr.r2_point + tr.r3_point + tr.r4_point + tr.top3_points + tr.winner_points) AS total
      FROM tournament_results tr
      JOIN users u ON tr.user_id = u.user_id
      ORDER BY tr.tournament DESC, u.name ASC;
    `;

    // Group by user
    const map: Record<number, any> = {};
    rows.forEach(row => {
      if (!map[row.user_id]) {
        map[row.user_id] = {
          user_id: row.user_id,
          name: row.name,
          username: row.username,
          total_points: 0,
          results: [],
        };
      }
      const total = Number(row.total);
      map[row.user_id].total_points += total;
      map[row.user_id].results.push({
        tournament: row.tournament,
        r1_point:     Number(row.r1_point),
        r2_point:     Number(row.r2_point),
        r3_point:     Number(row.r3_point),
        r4_point:     Number(row.r4_point),
        top3_points:  Number(row.top3_points),
        winner_points: Number(row.winner_points),
        total,
      });
    });

    const standings = Object.values(map).sort((a: any, b: any) => b.total_points - a.total_points);
    return NextResponse.json({ standings }, { status: 200 });
  } catch (error) {
    console.log({ error });
    return NextResponse.json({ error }, { status: 500 });
  }
}
