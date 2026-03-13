export const formatScore = (score: number | string): string => {
  if (score === null || score === undefined || score === '-') return '-';
  if (score === 'E') return 'E';
  if (score === 'Cut') return 'Cut';
  if (typeof score === 'number') return score > 0 ? `+${score}` : `${score}`;
  return String(score);
};

export const getScoreColor = (score: number | string): string => {
  if (score === 'Cut' || score === '-' || score === null || score === undefined) return 'text-zinc-500';
  if (score === 'E') return 'text-white';
  const num = typeof score === 'number' ? score : parseFloat(String(score));
  if (isNaN(num)) return 'text-white';
  if (num < 0) return 'text-green-400';
  if (num > 0) return 'text-red-400';
  return 'text-white';
};

// For totalConvertedForMath (already a plain number)
export const getScoreColorFromNum = (num: number): string => {
  if (num < 0) return 'text-green-400';
  if (num > 0) return 'text-red-400';
  return 'text-white';
};

export const formatTourneyLabel = (tourneyId: string): string => {
  const [id, year] = tourneyId.split('-');
  return `${id} (${year})`;
};
