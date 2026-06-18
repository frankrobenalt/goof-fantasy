// @ts-nocheck
import { sql } from '@vercel/postgres';
import axios from 'axios';
import { NextResponse } from 'next/server';

const TOURNAMENT_ID = '026';
const YEAR = '2026';

const teamPicks = [
  { name: 'Harry',  username: 'harry',  picks: ['Scottie Scheffler', 'Russell Henley', 'Wyndham Clark', 'J.J. Spaun', 'Gerard'] },
  { name: 'Nick',   username: 'nick',   picks: ['Rory McIlroy', 'Justin Thomas', 'Si Woo Kim', 'Viktor Hovland', 'Knapp'] },
  { name: 'Garret', username: 'garret', picks: ['Cameron Young', 'Brooks Koepka', 'Chris Gotterup', 'Aaron Rai', 'Cameron Smith'] },
  { name: 'Jacob',  username: 'jacob',  picks: ['Tommy Fleetwood', 'Sam Burns', 'Bryson DeChambeau', 'Collin Morikawa', 'Hideki Matsuyama'] },
  { name: 'Travis', username: 'travis', picks: ['Ludvig Åberg', 'Xander Schauffele', 'Maverick McNealy', 'Justin Rose', 'Adam Scott'] },
  { name: 'Frank',  username: 'frank',  picks: ['Jon Rahm', 'Matt Fitzpatrick', 'Tyrell Hatton', 'Patrick Reed', 'Bud Cauley'] },
];

const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const findPlayer = (pickName: string, rows: any[]) => {
  const norm = normalize(pickName);
  const words = norm.split(' ');
  const lastName = words[words.length - 1];
  const firstName = words.slice(0, -1).join(' ');

  // Exact full name match
  const exact = rows.find(p => normalize(`${p.firstName} ${p.lastName}`) === norm);
  if (exact) return exact;

  // Last name + first name partial match
  if (firstName) {
    const match = rows.find(p =>
      normalize(p.lastName) === lastName &&
      normalize(p.firstName).includes(firstName)
    );
    if (match) return match;
  }

  // Last name only (if unique)
  const lastNameMatches = rows.filter(p => normalize(p.lastName) === lastName);
  if (lastNameMatches.length === 1) return lastNameMatches[0];

  return null;
};

export async function GET() {
  try {
    const tournament = `${TOURNAMENT_ID}-${YEAR}`;

    // Fetch leaderboard to get player IDs
    const leaderboardRes = await axios.request({
      method: 'GET',
      url: 'https://live-golf-data.p.rapidapi.com/leaderboard',
      params: { orgId: '1', tournId: TOURNAMENT_ID, year: YEAR },
      headers: {
        'X-RapidAPI-Key': process.env.NEXT_PUBLIC_RAPID_API_KEY,
        'X-RapidAPI-Host': 'live-golf-data.p.rapidapi.com',
      },
    });

    const leaderboardRows = leaderboardRes.data?.leaderboardRows ?? [];

    const results: any[] = [];
    const unmatched: string[] = [];

    for (const team of teamPicks) {
      // Get or create user — match on first name
      const existing = await sql`SELECT user_id FROM users WHERE LOWER(name) LIKE LOWER(${team.name + '%'});`;
      let userId: number;

      if (existing.rows.length > 0) {
        userId = existing.rows[0].user_id;
      } else {
        const created = await sql`
          INSERT INTO users (name, username, password, email, created_on)
          VALUES (${team.name}, ${team.username}, '', ${team.username + '@goof.golf'}, NOW())
          RETURNING user_id;
        `;
        userId = created.rows[0].user_id;
      }

      // Clear existing picks for this tournament
      await sql`DELETE FROM picks WHERE user_id = ${userId} AND tournament = ${tournament};`;

      // Match and insert each pick
      const teamResults: any[] = [];
      for (const pickName of team.picks) {
        const player = findPlayer(pickName, leaderboardRows);
        if (player) {
          await sql`
            INSERT INTO picks (user_id, player_id, player_name, tournament)
            VALUES (${userId}, ${player.playerId}, ${player.firstName + ' ' + player.lastName}, ${tournament});
          `;
          teamResults.push({ input: pickName, matched: `${player.firstName} ${player.lastName}`, id: player.playerId });
        } else {
          unmatched.push(`${team.name}: ${pickName}`);
          teamResults.push({ input: pickName, matched: null });
        }
      }

      results.push({ user: team.name, userId, picks: teamResults });
    }

    return NextResponse.json({ success: true, results, unmatched }, { status: 200 });
  } catch (error) {
    console.log({ error });
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
