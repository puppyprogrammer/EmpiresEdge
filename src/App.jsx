import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import './index.css';

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

  useEffect(() => {
    supabase.auth.signOut().then(() => {
      setSession(null);
      setUserNation(null);
      setShowNationModal(false);

      supabase.auth.getSession().then(({ data }) => {
        setSession(data.session);
        if (data.session) checkUserNation(data.session.user.id);
      });
    });

    const { subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) checkUserNation(session.user.id);
      else {
        setUserNation(null);
        setShowNationModal(false);
      }
    });

    fetchTiles();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userNation || !tiles || !mapScrollRef.current) return;

    const capitalTile = tiles.find(
      (t) =>
        t.x === userNation.capital_tile_x &&
        t.y === userNation.capital_tile_y &&
        t.is_capital
    );
    if (!capitalTile) return;

    const container = mapScrollRef.current;
    const capitalPixelX = capitalTile.y * TILE_SIZE;
    const capitalPixelY = capitalTile.x * TILE_SIZE;

    container.scrollTo({
      left: capitalPixelX - container.clientWidth / 2 + TILE_SIZE / 2,
      top: capitalPixelY - container.clientHeight / 2 + TILE_SIZE / 2,
      behavior: 'smooth',
    });

    const tileEl = document.querySelector(`.tile[data-x="${capitalTile.x}"][data-y="${capitalTile.y}"]`);
    if (tileEl) {
      tileEl.classList.add('capital-highlight');
      setTimeout(() => {
        tileEl.classList.remove('capital-highlight');
      }, 1500);
    }
  }, [userNation, tiles]);

  async function fetchTiles() {
    try {
      const { data, error } = await supabase
        .from('tiles')
        .select('id, x, y, type, resource, owner, is_capital')
        .order('x', { ascending: true })
        .order('y', { ascending: true });

      if (error) {
        setError('Failed to fetch tiles: ' + error.message);
        setTiles([]);
      } else {
        console.log('Number of tiles fetched:', data.length); // Add this line
        setTiles(data);
      }
    } catch (err) {
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
        setError('Failed to create nation: ' + insertError.message);
        return;
      }

      const { error: capTileErr } = await supabase
        .from('tiles')
        .update({ owner: nationData.id, is_capital: true })
        .eq('x', capitalTile.x)
        .eq('y', capitalTile.y);

      if (capTileErr) {
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
          setError('Failed to update surrounding tile: ' + updateErr.message);
          return;
        }
      }

      fetchTiles();

      setUserNation(nationData);
      setShowNationModal(false);
      setNationName('');
    } catch (err) {
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
    if (error) setError(error.message);
    else {
      setLoginEmail('');
      setLoginPassword('');
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
    if (error) setError(error.message);
    else {
      alert('Registration successful! Please check your email to confirm.');
      setRegisterEmail('');
      setRegisterPassword('');
      setRegisterUsername('');
      setShowRegister(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setSession(null);
    setUserNation(null);
    setShowNationModal(false);
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

        {session && (
          <div className="user-info">
            <span className="username">
              {session.user.user_metadata?.username || session.user.email}
            </span>
            <button className="button" onClick={handleLogout}>
              LOGOUT
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
        <div className="map-scroll-container" ref={mapScrollRef}>
          <div className="map-grid">
            {tiles.map((tile) => (
              <div
                key={tile.id}
                className={`tile ${tile.type} ${tile.is_capital ? 'capital-highlight' : ''}`}
                data-x={tile.x}
                data-y={tile.y}
                title={`(${tile.x}, ${tile.y}) Type: ${tile.type}, Resource: ${tile.resource || 'None'}, Owner: ${tile.owner || 'None'}`}
              />
            ))}
          </div>
        </div>
      )}

      {tiles === null && !error && <div className="loading-message">Loading map data...</div>}
    </div>
  );
}

export default App;