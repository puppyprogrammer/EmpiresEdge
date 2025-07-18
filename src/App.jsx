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

  const getTileClass = (type) => {
    switch (type) {
      case 'grass':
        return 'w-8 h-8 bg-green-500';
      case 'forest':
        return 'w-8 h-8 bg-green-700';
      default:
        return 'w-8 h-8 bg-gray-500';
    }
  };

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
            className="overflow-auto border border-gray-700"
            style={{ width: '800px', height: '800px' }}
          >
            <div
              className="grid gap-0.5"
              style={{
                gridTemplateColumns: 'repeat(100, 1fr)', // 100 columns
              }}
            >
              {tiles.map((tile) => (
                <div
                  key={tile.id}
                  className={getTileClass(tile.type)}
                  title={`(${tile.x}, ${tile.y}) Type: ${tile.type}, Resource: ${tile.resource || 'None'}, Owner: ${tile.owner || 'None'}`}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
