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
          .select('id, name, owner_id, capital_tile_x, capital_tile_y, color, lumber, oil, ore, total_resources')
          .order('total_resources', { ascending: false }); // Now uses the computed column

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

  // Rest of the component remains the same
  // ...
};

export default RankingsPage;