import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import './index.css';

const supabase = createClient(
  'https://kbiaueussvcshwlvaabu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiaWF1ZXVzc3Zjc2h3bHZhYWJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NTU1MDYsImV4cCI6MjA2ODMzMTUwNn0.MJ82vub25xntWjRaK1hS_37KwdDeckPQkZDF4bzZC3U'
);

function App() {
  const [tiles, setTiles] = useState(null); // null = loading
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTiles = async () => {
      try {
        const { data, error } = await supabase
          .from('tiles')
          .select('id, x, y, type, resource, owner');

        if (error) {
          setError('Supabase error: ' + error.message);
        } else if (!data || data.length === 0) {
          setError('No tiles returned. Check if Supabase "tiles" table has rows and is publicly readable.');
          setTiles([]);
        } else {
          setTiles(data);
        }
      } catch (err) {
        setError('Unexpected fetch error: ' + err.message);
      }
    };

    fetchTiles();
  }, []);

  return (
    <div className="flex flex-col justify-center items-center h-screen bg-gray-800 text-white p-4 space-y-4">
      <h1 className="text-3xl font-bold">Empire’s Edge</h1>

      {tiles === null && !error && (
        <div className="text-yellow-400 text-lg">Loading map data...</div>
      )}

      {error && (
        <div className="text-red-400 text-lg bg-red-950 p-4 rounded-xl border border-red-600 max-w-lg">
          {error}
        </div>
      )}

      {tiles && tiles.length > 0 && (
        <>
          <div className="text-green-300 text-sm">Loaded {tiles.length} tiles.</div>
          <div
            className="grid grid-cols-10 gap-0.5 border border-gray-700 p-1"
            style={{ width: '500px', height: '500px', overflow: 'auto' }}
          >
            {tiles.map(tile => (
              <div
                key={tile.id}
                className={`w-10 h-10 ${
                  tile.type === 'grass'
                    ? 'bg-green-500'
                    : tile.type === 'forest'
                    ? 'bg-green-700'
                    : 'bg-gray-500'
                }`}
                title={`(${tile.x}, ${tile.y}) Type: ${tile.type}, Resource: ${tile.resource || 'None'}, Owner: ${tile.owner || 'None'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default App;
