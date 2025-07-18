import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import './index.css';

const supabase = createClient(
  'https://kbiaueussvcshwlvaabu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiaWF1ZXVzc3Zjc2h3bHZhYWJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NTU1MDYsImV4cCI6MjA2ODMzMTUwNn0.MJ82vub25xntWjRaK1hS_37KwdDeckPQkZDF4bzZC3U'
);

function App() {
  const [tiles, setTiles] = useState([]);

  useEffect(() => {
    const fetchTiles = async () => {
      const { data, error } = await supabase
        .from('tiles')
        .select('id, x, y, type, resource, owner');
      if (error) console.error('Error fetching tiles:', error);
      else setTiles(data || []);
    };
    fetchTiles();
  }, []);

  return (
    <div className="flex justify-center items-center h-screen bg-gray-800">
      <h1 className="text-3xl font-bold text-white mb-4">Empire’s Edge</h1>
      <div className="grid grid-cols-10 gap-0.5" style={{ width: '500px', height: '500px' }}>
        {tiles.map(tile => (
          <div
            key={tile.id}
            className={`w-20 h-20 ${tile.type === 'grass' ? 'bg-green-500' : tile.type === 'forest' ? 'bg-green-700' : 'bg-gray-500'}`}
            title={`(${tile.x}, ${tile.y}) Type: ${tile.type}, Resource: ${tile.resource || 'None'}, Owner: ${tile.owner || 'None'}`}
          ></div>
        ))}
      </div>
    </div>
  );
}

export default App;