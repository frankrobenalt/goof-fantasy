import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

const FAKE_USER_IDS = [60, 61, 62, 63, 64, 65];

export async function GET() {
  await sql`DELETE FROM picks WHERE user_id = ANY(${FAKE_USER_IDS as any});`;
  await sql`DELETE FROM users WHERE user_id = ANY(${FAKE_USER_IDS as any});`;
  return NextResponse.json({ deleted: FAKE_USER_IDS });
}
