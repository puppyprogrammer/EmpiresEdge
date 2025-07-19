import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import './index.css';
import { User, LogOut } from 'lucide-react';
import { Analytics } from "@vercel/analytics/react";

const supabaseUrl = 'https://kbiaueussvcshwlvaabu.supabase.co';
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiaWF1ZXVzc3Zjc2h3bHZhYWJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NTU1MDYsImV4cCI6MjA2ODMzMTUwNn0.MJ82vub25xntWjRaK1hS_37KwdDeckPQkZDF4bzZC3U';
const supabase = createClient(supabaseUrl, supabaseKey);

function App() {
  const mapScrollRef = useRef(null);
  const TILE_SIZE = 32;

  const [tiles, setTiles] = useState(null);
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [showNationModal, setShowNationModal] = useState(false);
  const [nationName, setNationName] = useState('');
  const [nationColor, setNationColor] = useState('#2563eb');
  const [userNation, setUserNation] = useState(null);
  const [nations, setNations] = useState({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) checkUserNation(data.session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) checkUserNation(session.user.id);
      else {
        setUserNation(null);
        setShowNationModal(false);
      }
      fetchTiles();
    });

    fetchTiles();

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userNation || !tiles || !mapScrollRef.current) return;

    const capitalTile = tiles.find(
      (t) => t.x === userNation.capital_tile_x && t.y === userNation.capital_tile_y && t.is_capital
    );
    if (!capitalTile) return;

    const container = mapScrollRef.current;
    const capitalPixelX = capitalTile.y * TILE_SIZE;
    const capitalPixelY = capitalTile.x * TILE_SIZE;

    container.scrollTo({
      left: capitalPixelX - (container.clientWidth / 2) + (TILE_SIZE / 2),
      top: capitalPixelY - (container.clientHeight / 2) + (TILE_SIZE / 2),
      behavior: 'smooth',
    });

    const tileEl = document.querySelector(`.tile[data-x="${capitalTile.x}"][data-y="${capitalTile.y}"]`);
    if (tileEl) {
      tileEl.classList.add('capital-highlight');
    }
  }, [userNation, tiles]);

  async function fetchTiles() {
    try {
      // Fetch nations data
      const { data: nationsData, error: nationsError } = await supabase
        .from('nations')
        .select('id, color');

      if (nationsError) {
        console.error('Nations fetch error:', nationsError);
        setError('Failed to fetch nations: ' + nationsError.message);
        setTiles([]);
        return;
      }

      // Map nation IDs to colors
      const nationsMap = {};
      nationsData.forEach(nation => {
        nationsMap[nation.id] = { color: nation.color };
      });
      setNations(nationsMap);
      console.log('Fetched nations:', nationsMap);
      console.log('Number of nations:', Object.keys(nationsMap).length);

      let allTiles = [];
      let from = 0;
      const limit = 1000;

      const { count, error: countError } = await supabase
        .from('tiles')
        .select('id, x, y, type, resource, owner, is_capital', { count: 'exact', head: true })
        .order('x', { ascending: true })
        .order('y', { ascending: true });

      if (countError) {
        console.error('Tile count error:', countError);
        setError('Failed to fetch tile count: ' + countError.message);
        setTiles([]);
        return;
      }

      const totalRows = count || 10000;

      while (from < totalRows) {
        const { data, error } = await supabase
          .from('tiles')
          .select('id, x, y, type, resource, owner, is_capital')
          .order('x', { ascending: true })
          .order('y', { ascending: true })
          .range(from, from + limit - 1);

        if (error) {
          console.error('Tile fetch error:', error);
          setError('Failed to fetch tiles: ' + error.message);
          setTiles([]);
          return;
        }

        // Check for orphaned tiles
        const tileOwners = [...new Set(data.filter(t => t.owner).map(t => t.owner))];
        const missingNationIds = tileOwners.filter(owner => !nationsMap[owner]);
        if (missingNationIds.length > 0) {
          console.warn('Orphaned tile owners (not in nations):', missingNationIds);
        }

        // Enrich tiles with nation color
        const enrichedTiles = data.map(tile => {
          if (tile.owner && !nationsMap[tile.owner]) {
            console.warn(`Orphaned tile (${tile.x}, ${tile.y}): owner ${tile.owner} not found in nations`);
            return { ...tile, nations: null };
          }
          return {
            ...tile,
            nations: tile.owner ? nationsMap[tile.owner] : null
          };
        });

        allTiles = [...allTiles, ...enrichedTiles];
        from += limit;
      }

      console.log('Number of tiles fetched:', allTiles.length, 'Total rows in table:', totalRows);
      console.log('Number of owned tiles:', allTiles.filter(t => t.owner).length);
      console.log('Sample enriched tiles:', allTiles.filter(t => t.owner).slice(0, 5));
      setTiles(allTiles);
    } catch (err) {
      console.error('Fetch tiles error:', err);
      setError('Error fetching tiles: ' + err.message);
      setTiles([]);
    }
  }

  async function checkUserNation(userId) {
    try {
      const { data, error } = await supabase
        .from('nations')
        .select('*')
        .eq('owner_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Check nation error:', error);
        setError(error.message);
        return;
      }

      if (data) {
        setUserNation(data);
        setShowNationModal(false);
      } else {
        setUserNation(null);
        setShowNationModal(true);
      }
    } catch (err) {
      console.error('Check nation error:', err);
      setError('Failed to check nation: ' + err.message);
    }
  }

  function tilesWithinDistance(centerTile, distance, tilesArr) {
    return tilesArr.filter(
      (t) => Math.abs(t.x - centerTile.x) + Math.abs(t.y - centerTile.y) <= distance
    );
  }

  function findCapitalTile() {
    const capitalTiles = tiles.filter((t) => t.is_capital);
    const minDistance = 3;

    const candidates = tiles.filter((tile) => {
      return capitalTiles.every(
        (cap) => Math.abs(tile.x - cap.x) + Math.abs(tile.y - cap.y) >= minDistance
      );
    });

    if (candidates.length === 0) return null;

    const idx = Math.floor(Math.random() * candidates.length);
    return candidates[idx];
  }

  async function handleStartGame() {
    if (!nationName.trim()) {
      setError('Nation name is required');
      return;
    }
    setError(null);

    const capitalTile = findCapitalTile();
    if (!capitalTile) {
      setError('No available tile to place capital.');
      return;
    }

    try {
      const { data: nationData, error: insertError } = await supabase
        .from('nations')
        .insert([
          {
            name: nationName.trim(),
            color: nationColor,
            owner_id: session.user.id,
            capital_tile_x: capitalTile.x,
            capital_tile_y: capitalTile.y,
          },
        ])
        .select()
        .single();

      if (insertError) {
        console.error('Nation insert error:', insertError);
        setError('Failed to create nation: ' + insertError.message);
        return;
      }

      const { error: capTileErr } = await supabase
        .from('tiles')
        .update({ owner: nationData.id, is_capital: true })
        .eq('x', capitalTile.x)
        .eq('y', capitalTile.y);

      if (capTileErr) {
        console.error('Capital tile update error:', capTileErr);
        setError('Failed to update capital tile: ' + capTileErr.message);
        return;
      }

      const surroundingTiles = tilesWithinDistance(capitalTile, 1, tiles).filter(
        (t) => !(t.x === capitalTile.x && t.y === capitalTile.y)
      );

      for (const tile of surroundingTiles) {
        const { error: updateErr } = await supabase
          .from('tiles')
          .update({ owner: nationData.id })
          .eq('x', tile.x)
          .eq('y', tile.y);

        if (updateErr) {
          console.error('Surrounding tile update error:', updateErr);
          setError('Failed to update surrounding tile: ' + updateErr.message);
          return;
        }
      }

      fetchTiles();

      setUserNation(nationData);
      setShowNationModal(false);
      setNationName('');
    } catch (err) {
      console.error('Start game error:', err);
      setError('Error creating nation: ' + err.message);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    if (error) {
      console.error('Login error:', error);
      setError(error.message);
    } else {
      setLoginEmail('');
      setLoginPassword('');
      fetchTiles();
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.auth.signUp({
      email: registerEmail,
      password: registerPassword,
      options: {
        data: { username: registerUsername },
      },
    });
    if (error) {
      console.error('Register error:', error);
      setError(error.message);
    } else {
      alert('Registration successful! Please check your email to confirm.');
      setRegisterEmail('');
      setRegisterPassword('');
      setRegisterUsername('');
      setShowRegister(false);
    }
  }

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUserNation(null);
      setShowNationModal(false);
      fetchTiles();
    } catch (err) {
      console.error('Logout error:', err);
      setError('Failed to log out: ' + err.message);
    }
  }

  function getTileBorderClasses(tile) {
    // Check if tile has owner and nation data
    if (!tile.owner) {
      console.log(`No border for tile (${tile.x}, ${tile.y}): No owner`);
      return '';
    }
    if (!tile.nations) {
      console.log(`No border for tile (${tile.x}, ${tile.y}): No nations data, owner=${tile.owner}`);
      return '';
    }
    if (!tile.nations.color) {
      console.log(`No border for tile (${tile.x}, ${tile.y}): No nation color, owner=${tile.owner}, nations=${JSON.stringify(tile.nations)}`);
      return '';
    }

    const ownerId = tile.owner;
    const borders = [];

    // Create a Map for faster tile lookup
    const tileMap = new Map(tiles.map(t => [`${t.x},${t.y}`, t]));

    console.log(`Processing borders for tile (${tile.x}, ${tile.y}): owner=${ownerId}, color=${tile.nations.color}`);

    const adjacentTiles = [
      { dx: -1, dy: 0, side: 'top' },    // Tile above
      { dx: 1, dy: 0, side: 'bottom' },  // Tile below
      { dx: 0, dy: 1, side: 'right' },   // Tile to the right
      { dx: 0, dy: -1, side: 'left' },   // Tile to the left
    ];

    adjacentTiles.forEach(({ dx, dy, side }) => {
      const adjKey = `${tile.x + dx},${tile.y + dy}`;
      const adjacentTile = tileMap.get(adjKey);
      console.log(`Checking adjacent tile (${tile.x + dx}, ${tile.y + dy}): exists=${!!adjacentTile}, owner=${adjacentTile ? adjacentTile.owner : 'none'}`);
      if (!adjacentTile || adjacentTile.owner !== ownerId) {
        borders.push(`border-${side}`);
      }
    });

    const borderClasses = borders.join(' ');
    console.log(`Assigned borders for tile (${tile.x}, ${tile.y}): ${borderClasses || 'none'}`);
    return borderClasses;
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-title">Empire’s Edge</div>

        {!session && !showRegister && (
          <form className="login-form" onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Email"
              className="input"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              className="input"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              required
            />
            <button type="submit" className="button">
              LOGIN
            </button>
            <button
              type="button"
              className="button"
              onClick={() => {
                setShowRegister(true);
                setError(null);
              }}
              style={{ marginLeft: '0.5rem' }}
            >
              REGISTER
            </button>
          </form>
        )}

        {!session && showRegister && (
          <form className="login-form" onSubmit={handleRegister}>
            <input
              type="email"
              placeholder="Email"
              className="input"
              value={registerEmail}
              onChange={(e) => setRegisterEmail(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Username"
              className="input"
              value={registerUsername}
              onChange={(e) => setRegisterUsername(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              className="input"
              value={registerPassword}
              onChange={(e) => setRegisterPassword(e.target.value)}
              required
            />
            <button type="submit" className="button">
              REGISTER
            </button>
            <button
              type="button"
              className="button"
              onClick={() => {
                setShowRegister(false);
                setError(null);
              }}
              style={{ marginLeft: '0.5rem' }}
            >
              BACK TO LOGIN
            </button>
          </form>
        )}

        {session?.user && (
          <div className="session-icons">
            <User className="icon" title="Profile" />
            <button onClick={handleLogout} title="Log out">
              <LogOut className="icon" />
            </button>
          </div>
        )}
      </header>

      {error && <div className="error-box">{error}</div>}

      {showNationModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Create Your Nation</h2>
            <input
              type="text"
              placeholder="Nation Name"
              value={nationName}
              onChange={(e) => setNationName(e.target.value)}
              className="input"
            />
            <label>
              Pick Nation Color:{' '}
              <input
                type="color"
                value={nationColor}
                onChange={(e) => setNationColor(e.target.value)}
              />
            </label>
            <button className="button" onClick={handleStartGame}>
              Start Game
            </button>
          </div>
        </div>
      )}

      {tiles && tiles.length > 0 && (
        <div>
          <div className="map-scroll-container" ref={mapScrollRef}>
            <div className="map-grid">
              {tiles.map((tile) => (
                <div
                  key={tile.id}
                  className={`tile ${tile.type} ${tile.is_capital ? 'capital-highlight' : ''} ${getTileBorderClasses(tile)}`}
                  data-x={tile.x}
                  data-y={tile.y}
                  title={`(${tile.x}, ${tile.y}) Type: ${tile.type}, Resource: ${tile.resource || 'None'}, Owner: ${tile.owner || 'None'}`}
                  style={tile.owner && tile.nations && tile.nations.color ? { '--nation-color': tile.nations.color } : {}}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {tiles === null && !error && <div className="loading-message">Loading map data...</div>}
      <Analytics />
    </div>
  );
}

export default App;