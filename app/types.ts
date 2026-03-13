export interface Pick {
  pick_id: string;
  playerId: string;
  name: string;
  currentRoundScore: number | string;
  currentHolesThrough: number | string;
  total: number | string;
  totalConvertedForMath: number;
  round1Score: number;
  round2Score: number;
  round3Score: number | string;
  round4Score: number | string;
  totalStrokesFromCompletedRounds: number;
}

export interface PlayerData {
  user_id: number;
  name: string;
  username: string;
  picks: Pick[];
  lowRoundOneScore: number | string;
  lowRoundTwoScore: number | string;
  lowRoundThreeScore: number | string;
  lowRoundFourScore: number | string;
  topThree: number | string;
}

export interface LowPickEntry {
  pick: Pick;
  user_id: number;
  name: string;
  username: string;
}

export interface WinnersData {
  roundOneLow: LowPickEntry[] | null;
  roundTwoLow: LowPickEntry[] | null;
  roundThreeLow: LowPickEntry[] | null;
  roundFourLow: LowPickEntry[] | null;
  topThree: PlayerData | null;
  pickedWinner: (PlayerData & { winner: { firstName: string; lastName: string; playerId: string } }) | null;
}

export interface TournamentResult {
  tournament: string;
  r1_point: number;
  r2_point: number;
  r3_point: number;
  r4_point: number;
  top3_points: number;
  winner_points: number;
  total: number;
}

export interface SeasonStanding {
  user_id: number;
  name: string;
  username: string;
  total_points: number;
  results: TournamentResult[];
}
