import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kbiaueussvcshwlvaabu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiaWF1ZXVzc3Zjc2h3bHZhYWJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NTU1MDYsImV4cCI6MjA2ODMzMTUwNn0.MJ82vub25xntWjRaK1hS_37KwdDeckPQkZDF4bzZC3U';
const supabase = createClient(supabaseUrl, supabaseKey);

const OnlinePlayersPage = () => {
  const [onlineNations, setOnlineNations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOnlineNations = async () => {
      try {
        const { data, error } = await supabase.rpc('get_recently_online_nations');
        if (error) {
          throw new Error(`Failed to fetch online nations: ${error.message} (code: ${error.code})`);
        }
        setOnlineNations(data || []);
      } catch (err) {
        console.error('Error fetching online nations:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOnlineNations();

    const intervalId = setInterval(fetchOnlineNations, 15000);

    return () => clearInterval(intervalId);
  }, []);

  if (loading) return <div>Loading online nations...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="online-players-page">
      <div>Online Nations</div>
      {onlineNations.length === 0 ? (
        <p>No nations online in the last 5 minutes.</p>
      ) : (
        <table>
          <tbody>
            {onlineNations.map((nation, index) => (
              <tr key={nation.nation_name}>
                <td>{index + 1}</td>
                <td style={{ color: nation.color }}>{nation.nation_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default OnlinePlayersPage;