"use client"
import axios from 'axios';
import { useEffect, useState } from 'react';
import { currentTourneyId, tourneyOptions } from './constants';

export default function Home() {
  const [playerPicks, setPlayerPicks] = useState([]);
  const [winnersData, setWinnersData] = useState({});
  const [tourneyId, setTourneyId] = useState(currentTourneyId);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    axios.post('/api/get-data', { tourneyId }).then(response => {
      setPlayerPicks(response?.data?.playerPicksData);
      setWinnersData(response?.data?.winnersData);
      setLoading(false);
    });
  }, [tourneyId]);

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Goof Fantasy Golf</h1>
      <label htmlFor="tourney" className="text-xs mb-1 block">Tournament</label>
      <select
        id="tourney"
        className="text-black mb-6"
        defaultValue={tourneyId}
        onChange={e => setTourneyId(e.target.value)}
      >
        {tourneyOptions.map(opt => (
          <option key={opt.id} value={opt.id}>{opt.name}</option>
        ))}
      </select>

      {loading && <p>Loading...</p>}

      {/* Components will go here */}
    </main>
  );
}
