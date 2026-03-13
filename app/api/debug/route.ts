import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
  const users = await sql`SELECT user_id, name, username, email FROM users ORDER BY user_id;`;
  const picks = await sql`SELECT user_id, player_name, tournament FROM picks WHERE tournament = '011-2026' ORDER BY user_id;`;
  return NextResponse.json({ users: users.rows, picks: picks.rows });
}
