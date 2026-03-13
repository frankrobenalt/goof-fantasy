'use client';
import { SeasonStanding } from '../types';
import { tourneyOptions } from '../constants';

const tourneyName = (id: string) => {
  const [tid] = id.split('-');
  return tourneyOptions.find(t => t.id === tid)?.name ?? id;
};

export default function SeasonStandings({ standings }: { standings: SeasonStanding[] }) {
  if (!standings.length) {
    return (
      <div className="text-zinc-500 text-center py-16">
        No season data yet. Results are saved after each tournament completes.
      </div>
    );
  }

  // Collect all tournaments played so far, ordered most recent first
  const allTourneys = Array.from(
    new Set(standings.flatMap(s => s.results.map(r => r.tournament)))
  ).sort((a, b) => b.localeCompare(a));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-zinc-500 text-xs uppercase tracking-wide border-b border-zinc-800">
            <th className="text-left px-4 py-3 font-medium w-8">#</th>
            <th className="text-left px-4 py-3 font-medium">Player</th>
            <th className="px-4 py-3 font-medium text-amber-400">Total</th>
            {allTourneys.map(t => (
              <th key={t} className="px-3 py-3 font-medium text-zinc-500">{tourneyName(t)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {standings.map((standing, i) => {
            const isFirst = i === 0;
            return (
              <tr key={standing.user_id} className={`border-b border-zinc-800/50 ${isFirst ? 'bg-amber-500/5' : ''}`}>
                <td className="px-4 py-3 text-zinc-500">{i + 1}</td>
                <td className="px-4 py-3">
                  <span className={`font-semibold ${isFirst ? 'text-amber-400' : 'text-white'}`}>
                    {isFirst && '🏆 '}{standing.name}
                  </span>
                  <span className="text-zinc-500 text-xs ml-2">@{standing.username}</span>
                </td>
                <td className="px-4 py-3 text-center font-bold text-amber-400">{standing.total_points}</td>
                {allTourneys.map(t => {
                  const result = standing.results.find(r => r.tournament === t);
                  return (
                    <td key={t} className="px-3 py-3 text-center">
                      {result ? (
                        <span className="font-mono text-white">{result.total}</span>
                      ) : (
                        <span className="text-zinc-700">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
