'use client';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { currentTourneyId, tourneyOptions } from './constants';
import { PlayerData, WinnersData, SeasonStanding } from './types';
import PointsBoard from './components/PointsBoard';
import PlayerScorecard from './components/PlayerScorecard';
import SeasonStandings from './components/SeasonStandings';

type Tab = 'week' | 'season';

export default function Home() {
  const [tab, setTab] = useState<Tab>('week');
  const [tourneyId, setTourneyId] = useState(currentTourneyId);
  const [playerPicks, setPlayerPicks] = useState<PlayerData[]>([]);
  const [winnersData, setWinnersData] = useState<WinnersData>({
    roundOneLow: null,
    roundTwoLow: null,
    roundThreeLow: null,
    roundFourLow: null,
    topThree: null,
    pickedWinner: null,
  });
  const [standings, setStandings] = useState<SeasonStanding[]>([]);
  const [loading, setLoading] = useState(false);
  const [seasonLoading, setSeasonLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    axios.post('/api/get-data', { tourneyId }).then(res => {
      setPlayerPicks(res.data?.playerPicksData ?? []);
      setWinnersData(res.data?.winnersData ?? {});
      setLoading(false);
    });
  }, [tourneyId]);

  useEffect(() => {
    if (tab !== 'season') return;
    setSeasonLoading(true);
    axios.get('/api/get-season-standings').then(res => {
      setStandings(res.data?.standings ?? []);
      setSeasonLoading(false);
    });
  }, [tab]);

  const currentTourneyName = tourneyOptions.find(t => t.id === tourneyId)?.name ?? tourneyId;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Goof Fantasy Golf</h1>
            {tab === 'week' && (
              <p className="text-zinc-500 text-sm mt-0.5">{currentTourneyName}</p>
            )}
          </div>
          {tab === 'week' && (
            <div>
              <label htmlFor="tourney" className="text-xs text-zinc-500 block mb-1">Tournament</label>
              <select
                id="tourney"
                value={tourneyId}
                onChange={e => setTourneyId(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-zinc-500"
              >
                {tourneyOptions.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-zinc-800 px-6">
        <div className="max-w-6xl mx-auto flex gap-0">
          {(['week', 'season'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t === 'week' ? 'This Week' : 'Season'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-6">
        {tab === 'week' && (
          <>
            {loading ? (
              <div className="text-zinc-500 py-16 text-center">Loading...</div>
            ) : (
              <>
                <PointsBoard winnersData={winnersData} />
                <div className="space-y-4">
                  {playerPicks.map(player => (
                    <PlayerScorecard
                      key={player.user_id}
                      player={player}
                      winnersData={winnersData}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {tab === 'season' && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-300">Season Standings — 2026</h2>
            </div>
            {seasonLoading ? (
              <div className="text-zinc-500 py-16 text-center">Loading...</div>
            ) : (
              <SeasonStandings standings={standings} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
