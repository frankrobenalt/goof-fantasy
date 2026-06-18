// @ts-nocheck
import { NextResponse } from 'next/server';
import { saveResults } from '../../lib/tournament';

// POST { tourneyId, year?, playerPicksData, winnersData }
// Call this after a tournament is officially complete to lock in season points.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tourneyId, year = '2026', playerPicksData, winnersData } = body;

    if (!tourneyId || !playerPicksData || !winnersData) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const points = await saveResults(tourneyId, year, playerPicksData, winnersData);

    return NextResponse.json({ message: 'Results saved', points }, { status: 200 });
  } catch (error) {
    console.log({ error });
    return NextResponse.json({ error }, { status: 500 });
  }
}
