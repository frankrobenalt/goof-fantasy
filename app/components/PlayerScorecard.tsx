'use client';
import { PlayerData, WinnersData, Pick } from '../types';
import { formatScore, getScoreColor, getScoreColorFromNum } from '../utils';

interface Props {
  player: PlayerData;
  winnersData: WinnersData;
}

export default function PlayerScorecard({ player, winnersData }: Props) {
  const pointsEarned = calcPoints(player, winnersData);

  // Identify top 3 picks (excluding cuts) for highlight
  const activePicks = player.picks
    .filter(p => p.total !== 'Cut')
    .sort((a, b) => a.totalConvertedForMath - b.totalConvertedForMath);
  const top3Ids = new Set(activePicks.slice(0, 3).map(p => p.pick_id));

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div>
          <span className="text-white font-semibold">{player.name}</span>
          <span className="text-zinc-500 text-sm ml-2">@{player.username}</span>
        </div>
        {pointsEarned > 0 && (
          <span className="bg-amber-500 text-black text-xs font-bold px-2 py-1 rounded-full">
            {pointsEarned} pt{pointsEarned !== 1 ? 's' : ''} this week
          </span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-zinc-500 text-xs uppercase tracking-wide border-b border-zinc-800">
              <th className="text-left px-4 py-2 font-medium">Player</th>
              <th className="px-3 py-2 font-medium">Score</th>
              <th className="px-3 py-2 font-medium">Today</th>
              <th className="px-3 py-2 font-medium">Thru</th>
              <th className="px-3 py-2 font-medium">R1</th>
              <th className="px-3 py-2 font-medium">R2</th>
              <th className="px-3 py-2 font-medium">R3</th>
              <th className="px-3 py-2 font-medium">R4</th>
            </tr>
          </thead>
          <tbody>
            {player.picks.map(pick => {
              const isTop3 = top3Ids.has(pick.pick_id);
              const isCut = pick.total === 'Cut';
              return (
                <tr
                  key={pick.pick_id}
                  className={`border-b border-zinc-800/50 ${isTop3 ? 'bg-green-950/30' : ''} ${isCut ? 'opacity-40' : ''}`}
                >
                  <td className="px-4 py-2 text-left">
                    <span className={`text-white ${isCut ? 'line-through' : ''}`}>{pick.name}</span>
                    {isTop3 && !isCut && (
                      <span className="ml-2 text-xs text-green-500 font-medium">top 3</span>
                    )}
                  </td>
                  <td className={`px-3 py-2 text-center font-mono ${getScoreColorFromNum(pick.totalConvertedForMath)}`}>
                    {isCut ? 'Cut' : formatScore(pick.total)}
                  </td>
                  <td className={`px-3 py-2 text-center font-mono ${getScoreColor(pick.currentRoundScore)}`}>
                    {formatScore(pick.currentRoundScore)}
                  </td>
                  <td className="px-3 py-2 text-center text-zinc-400">
                    {pick.currentHolesThrough ?? '-'}
                  </td>
                  <td className="px-3 py-2 text-center text-zinc-300 font-mono">{pick.round1Score ?? '-'}</td>
                  <td className="px-3 py-2 text-center text-zinc-300 font-mono">{pick.round2Score ?? '-'}</td>
                  <td className="px-3 py-2 text-center text-zinc-300 font-mono">{pick.round3Score ?? '-'}</td>
                  <td className="px-3 py-2 text-center text-zinc-300 font-mono">{pick.round4Score ?? '-'}</td>
                </tr>
              );
            })}

            {/* Low scores row */}
            <tr className="text-zinc-400 text-xs border-t border-zinc-700">
              <td className="px-4 py-2 font-medium uppercase tracking-wide text-zinc-500">Low / Best 3</td>
              <td className="px-3 py-2 text-center text-amber-400 font-mono font-semibold">
                {player.topThree !== '-' ? formatScore(Number(player.topThree)) : '-'}
              </td>
              <td colSpan={2} />
              <td className="px-3 py-2 text-center font-mono">{player.lowRoundOneScore}</td>
              <td className="px-3 py-2 text-center font-mono">{player.lowRoundTwoScore}</td>
              <td className="px-3 py-2 text-center font-mono">{player.lowRoundThreeScore}</td>
              <td className="px-3 py-2 text-center font-mono">{player.lowRoundFourScore}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function calcPoints(player: PlayerData, w: WinnersData): number {
  let pts = 0;
  if (w.roundOneLow?.[0]?.user_id   === player.user_id) pts += 1;
  if (w.roundTwoLow?.[0]?.user_id   === player.user_id) pts += 1;
  if (w.roundThreeLow?.[0]?.user_id === player.user_id) pts += 1;
  if (w.roundFourLow?.[0]?.user_id  === player.user_id) pts += 1;
  if (w.topThree?.user_id           === player.user_id) pts += 2;
  if (w.pickedWinner?.user_id       === player.user_id) pts += 2;
  return pts;
}
