'use client';
import { WinnersData, LowPickEntry, PlayerData } from '../types';
import { formatScore } from '../utils';

interface PointCardDef {
  label: string;
  points: number;
  type: 'round' | 'top3' | 'tournament';
  roundKey?: keyof LowPickEntry['pick'];
  data: LowPickEntry[] | PlayerData | (PlayerData & { winner: any }) | null;
}

export default function PointsBoard({ winnersData }: { winnersData: WinnersData }) {
  const cards: PointCardDef[] = [
    { label: 'Round 1', points: 1, type: 'round', roundKey: 'round1Score', data: winnersData.roundOneLow },
    { label: 'Round 2', points: 1, type: 'round', roundKey: 'round2Score', data: winnersData.roundTwoLow },
    { label: 'Round 3', points: 1, type: 'round', roundKey: 'round3Score', data: winnersData.roundThreeLow },
    { label: 'Round 4', points: 1, type: 'round', roundKey: 'round4Score', data: winnersData.roundFourLow },
    { label: 'Best 3',        points: 2, type: 'top3',       data: winnersData.topThree },
    { label: 'Picked Winner', points: 2, type: 'tournament', data: winnersData.pickedWinner },
  ];

  return (
    <div className="mb-8">
      <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Points This Week</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map(card => <PointCard key={card.label} card={card} />)}
      </div>
    </div>
  );
}

function PointCard({ card }: { card: PointCardDef }) {
  const won = !!card.data;

  const renderBody = () => {
    if (!card.data) {
      return <p className="text-zinc-600 text-sm mt-3">TBD</p>;
    }

    if (card.type === 'round') {
      const entries = card.data as LowPickEntry[];
      const winner = entries[0];
      const score = winner.pick[card.roundKey as keyof typeof winner.pick] as number | string;
      return (
        <div className="mt-3 space-y-0.5">
          <p className="text-white font-semibold text-sm">{winner.name}</p>
          <p className="text-zinc-400 text-xs truncate">{winner.pick.name}</p>
          <p className="text-green-400 font-mono text-sm">{score}</p>
        </div>
      );
    }

    if (card.type === 'top3') {
      const winner = card.data as PlayerData;
      const score = Number(winner.topThree);
      return (
        <div className="mt-3 space-y-0.5">
          <p className="text-white font-semibold text-sm">{winner.name}</p>
          <p className={`font-mono text-sm ${score < 0 ? 'text-green-400' : score > 0 ? 'text-red-400' : 'text-white'}`}>
            {formatScore(score)}
          </p>
        </div>
      );
    }

    if (card.type === 'tournament') {
      const winner = card.data as PlayerData & { winner: { firstName: string; lastName: string } };
      return (
        <div className="mt-3 space-y-0.5">
          <p className="text-white font-semibold text-sm">{winner.name}</p>
          <p className="text-zinc-400 text-xs truncate">{winner.winner.firstName} {winner.winner.lastName}</p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className={`rounded-xl border p-3 transition-colors ${
      won
        ? 'border-amber-500/40 bg-amber-500/5'
        : 'border-zinc-800 bg-zinc-900'
    }`}>
      <div className="flex items-center justify-between">
        <span className="text-zinc-400 text-xs uppercase tracking-wide">{card.label}</span>
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
          won ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-500'
        }`}>
          {card.points}pt{card.points > 1 ? 's' : ''}
        </span>
      </div>
      {renderBody()}
    </div>
  );
}
