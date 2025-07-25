﻿import React, { useState, useEffect } from 'react';
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
        const { data, error } = await supabase.rpc('get_nation_resource_rankings');

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
      <div>Nation Rankings</div>
      {rankings.length === 0 ? (
        <p>No nations ranked yet.</p>
      ) : (
        <table>
          <tbody>
            {rankings.map((nation, index) => (
              <tr key={nation.nation_id}>
                <td>{index + 1}</td>
                <td>{nation.nation_name}</td>
                <td>{nation.total_resources}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default RankingsPage;