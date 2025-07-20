import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kbiaueussvcshwlvaabu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiaWF1ZXVzc3Zjc2h3bHZhYWJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NTU1MDYsImV4cCI6MjA2ODMzMTUwNn0.MJ82vub25xntWjRaK1hS_37KwdDeckPQkZDF4bzZC3U';
const supabase = createClient(supabaseUrl, supabaseKey);

const RankingsPage = () => {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        const { data, error } = await supabase
          .from('nations')
          .select('id, name, owner_id, capital_tile_x, capital_tile_y, color, lumber, oil, ore')
          .order('lumber + oil + ore', { ascending: false }); // Sort by total resources

        if (error) throw error;

        setRankings(data || []);
      } catch (err) {
        setError('Failed to fetch rankings: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRankings();
  }, []);

  if (loading) return <div>Loading rankings...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="rankings-page">
      <h2>Nation Rankings</h2>
      {rankings.length === 0 ? (
        <p>No nations ranked yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Name</th>
              <th>Capital (X, Y)</th>
              <th>Total Resources</th>
            </tr>
          </thead>
          <tbody>
            {rankings.map((nation, index) => (
              <tr key={nation.id}>
                <td>{index + 1}</td>
                <td style={{ color: nation.color }}>{nation.name}</td>
                <td>({nation.capital_tile_x}, {nation.capital_tile_y})</td>
                <td>{nation.lumber + nation.oil + nation.ore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default RankingsPage;