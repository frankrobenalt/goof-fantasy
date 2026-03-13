import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS tournament_results (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        tournament VARCHAR(20) NOT NULL,
        r1_point INT DEFAULT 0,
        r2_point INT DEFAULT 0,
        r3_point INT DEFAULT 0,
        r4_point INT DEFAULT 0,
        top3_points INT DEFAULT 0,
        winner_points INT DEFAULT 0,
        UNIQUE(user_id, tournament)
      );
    `;
    return NextResponse.json({ message: 'Tables ready' }, { status: 200 });
  } catch (error) {
    console.log({ error });
    return NextResponse.json({ error }, { status: 500 });
  }
}
