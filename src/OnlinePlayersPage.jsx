import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kbiaueussvcshwlvaabu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiaWF1ZXVzc3Zjc2h3bHZhYWJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NTU1MDYsImV4cCI6MjA2ODMzMTUwNn0.MJ82vub25xntWjRaK1hS_37KwdDeckPQkZDF4bzZC3U';
const supabase = createClient(supabaseUrl, supabaseKey);

const OnlinePlayersPage = () => {
  const [onlinePlayers, setOnlinePlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOnlinePlayers = async () => {
      try {
        const { data, error } = await supabase.rpc('get_online_players');

        if (error) throw error;

        setOnlinePlayers(data || []);
      } catch (err) {
        setError('Failed to fetch online players: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOnlinePlayers();
    
    // Optional: Set up polling to refresh online players every 30 seconds
    const intervalId = setInterval(fetchOnlinePlayers, 30000);

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  if (loading) return <div>Loading online players...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="online-players-page">
      <h3>Online Players</h3>
      {onlinePlayers.length === 0 ? (
        <p>No players online right now.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Nation</th>
              <th>Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {onlinePlayers.map((player) => (
              <tr key={player.username}>
                <td>{player.username}</td>
                <td style={{ color: player.nation_color }}>
                  {player.nation_name || 'No Nation'}
                </td>
                <td>{new Date(player.last_seen).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default OnlinePlayersPage;