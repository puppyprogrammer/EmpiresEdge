import { useState, useEffect } from 'react';

function App() {
  const [tiles, setTiles] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // For test, hardcode some tiles or fetch real data here
    const sampleTiles = [];
    for (let i = 0; i < 1000; i++) {
      sampleTiles.push({
        id: i,
        x: Math.floor(i / 100),
        y: i % 100,
        type: i % 3 === 0 ? 'grass' : i % 3 === 1 ? 'forest' : 'mountain',
        resource: null,
        owner: null,
      });
    }
    setTiles(sampleTiles);
  }, []);

  const getTileStyle = (type) => {
    let bgColor;
    switch (type) {
      case 'grass':
        bgColor = '#22c55e';
        break;
      case 'forest':
        bgColor = '#166534';
        break;
      default:
        bgColor = '#6b7280';
    }
    return {
      width: '32px',
      height: '32px',
      backgroundColor: bgColor,
    };
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#1f2937',
        color: 'white',
        padding: '16px',
      }}
    >
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Empire’s Edge</h1>

      {tiles === null && !error && (
        <div style={{ color: '#facc15', fontSize: '1.125rem' }}>
          Loading map data...
        </div>
      )}

      {error && (
        <div
          style={{
            color: '#f87171',
            backgroundColor: '#4b0000',
            padding: '1rem',
            borderRadius: '0.75rem',
            border: '1px solid #dc2626',
            maxWidth: '32rem',
            fontSize: '1.125rem',
          }}
        >
          {error}
        </div>
      )}

      {tiles && tiles.length > 0 && (
        <>
          <div style={{ color: '#86efac', fontSize: '0.875rem' }}>
            Loaded {tiles.length} tiles.
          </div>
          <div
            style={{
              overflow: 'auto',
              border: '1px solid #374151',
              width: '800px',
              height: '800px',
              marginTop: '8px',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(100, 1fr)',
                gap: '2px',
              }}
            >
              {tiles.map((tile) => (
                <div
                  key={tile.id}
                  style={getTileStyle(tile.type)}
                  title={`(${tile.x}, ${tile.y}) Type: ${tile.type}, Resource: ${
                    tile.resource || 'None'
                  }, Owner: ${tile.owner || 'None'}`}
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
