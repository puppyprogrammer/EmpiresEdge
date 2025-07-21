import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import './index.css';
import { User, LogOut } from 'lucide-react';
import { Analytics } from "@vercel/analytics/react";
import RankingsPage from './RankingsPage';
import OnlinePlayersPage from './OnlinePlayersPage';
import TileInformationPage from './TileInformationPage';

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
  const [resources, setResources] = useState({
    lumber: 0,
    oil: 0,
    ore: 0
  });
  const [showMainMenu, setShowMainMenu] = useState(false);
  const [showBottomMenu, setShowBottomMenu] = useState(false);
  const [selectedPage, setSelectedPage] = useState(null);
  const [selectedTile, setSelectedTile] = useState(null);

  useEffect(() => {
    let pollInterval = null;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        checkUserNation(data.session.user.id);
      }
    });

    fetchTiles();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        checkUserNation(session.user.id);
        fetchTiles();
      } else {
        setUserNation(null);
        setResources({ lumber: 0, oil: 0, ore: 0 });
        setShowNationModal(false);
        fetchTiles();
        setShowMainMenu(false);
        setShowBottomMenu(false);
        setSelectedTile(null);
      }
    });

    // Subscribe to real-time updates on tiles table
    const tilesSubscription = supabase
      .channel('tiles_changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tiles' },
        async (payload) => {
          console.log('Tiles table updated:', payload);
          let owner_nation_name = 'None';
          if (payload.new.owner) {
            const { data, error } = await supabase
              .from('nations')
              .select('name')
              .eq('id', payload.new.owner)
              .single();
            if (error) {
              console.error('Error fetching nation name for tile update:', error);
            } else {
              owner_nation_name = data?.name || 'None';
            }
          }
          setTiles((prevTiles) => {
            if (!prevTiles) return prevTiles;
            const updatedTile = {
              ...payload.new,
              owner_nation_name,
              nations: payload.new.owner ? nations[payload.new.owner] : null,
              x: payload.new.x,
              y: payload.new.y,
              building: payload.new.building ?? null
            };
            const newTiles = prevTiles.map((tile) =>
              tile.id === payload.new.id ? updatedTile : tile
            );
            if (selectedTile && selectedTile.id === payload.new.id) {
              console.log('Updating selectedTile with building:', updatedTile.building);
              setSelectedTile(updatedTile);
            }
            return newTiles;
          });
        }
      )
      .subscribe();

    if (session?.user?.id) {
      pollInterval = setInterval(async () => {
        await checkUserNation(session.user.id);
      }, 3000);
    }

    return () => {
      if (subscription) subscription.unsubscribe();
      if (pollInterval) clearInterval(pollInterval);
      supabase.removeChannel(tilesSubscription);
    };
  }, [session?.user?.id, nations]);

  useEffect(() => {

  }, [showMainMenu, showBottomMenu, tiles]);

  useEffect(() => {
    if (!userNation || !tiles || !mapScrollRef.current) return;

    const capitalTile = tiles.find(
      (tile) => tile.x === userNation.capital_tile_x && tile.y === userNation.capital_tile_y && tile.is_capital
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
      const { data: nationsData, error: nationsError } = await supabase
        .from('nations')
        .select('id, color');

      if (nationsError) {
        setError('Failed to fetch nations: ' + nationsError.message);
        setTiles([]);
        return;
      }

      const nationsMap = {};
      nationsData.forEach(nation => {
        nationsMap[nation.id] = { color: nation.color };
      });
      setNations(nationsMap);

      let allTiles = [];
      let from = 0;
      const limit = 1000;

      const { count, error: countError } = await supabase
        .from('tiles')
        .select('id', { count: 'exact', head: true })
        .order('x', { ascending: true })
        .order('y', { ascending: true });

      if (countError) {
        setError(`Failed to fetch tile count: ${countError.message} (code: ${countError.code}, details: ${countError.details})`);
        setTiles([]);
        return;
      }

      const totalRows = count || 10000;

      while (from < totalRows) {
        const { data, error } = await supabase
          .rpc('get_tiles_with_username', {
            start_row: from,
            end_row: from + limit - 1
          });

        if (error) {
          setError(`Failed to fetch tiles: ${error.message} (code: ${error.code}, details: ${error.details})`);
          setTiles([]);
          return;
        }

        const enrichedTiles = data.map(tile => {
          const tileData = {
            ...tile,
            owner_nation_name: tile.owner_nation_name || 'None',
            nations: tile.owner ? nationsMap[tile.owner] : null,
            x: tile.x,
            y: tile.y,
            building: tile.building ?? null
          };
          return tileData;
        });

        allTiles = [...allTiles, ...enrichedTiles];
        from += limit;
      }

      setTiles(allTiles);
    } catch (err) {
      setError(`Error fetching tiles: ${err.message}`);
      setTiles([]);
    }
  }

  async function checkUserNation(userId) {
    try {
      const { data, error } = await supabase
        .rpc('update_resources', { user_id: userId })
        .single();

      if (error && error.code !== 'PGRST116') {
        setError('Failed to update resources: ' + error.message);
        return;
      }

      if (data) {
        setUserNation({
          id: data.id,
          name: data.name,
          color: data.color,
          capital_tile_x: data.capital_tile_x,
          capital_tile_y: data.capital_tile_y,
          owner_id: data.owner_id,
          lumber: data.lumber,
          oil: data.oil,
          ore: data.ore
        });
        setResources({
          lumber: data.lumber || 0,
          oil: data.oil || 0,
          ore: data.ore || 0
        });
        setShowNationModal(false);
      } else {
        setUserNation(null);
        setResources({ lumber: 0, oil: 0, ore: 0 });
        setShowNationModal(true);
      }
    } catch (err) {
      setError('Failed to check nation: ' + err.message);
    }
  }

  function tilesWithinDistance(centerTile, distance, tilesArr) {
    return tilesArr.filter(
      (tile) => Math.abs(tile.x - centerTile.x) + Math.abs(tile.y - centerTile.y) <= distance
    );
  }

  function findCapitalTile() {
    if (!tiles || tiles.length === 0) {
      return null;
    }
    const capitalTiles = tiles.filter((tile) => {
      if (typeof tile.is_capital !== 'boolean') {
        return false;
      }
      return tile.is_capital;
    });

    const minDistance = 3;
    const candidates = tiles.filter((tile) => {
      if (tile.x === undefined || tile.y === undefined) {
        return false;
      }
      return capitalTiles.every(
        (cap) => Math.abs(tile.x - cap.x) + Math.abs(tile.y - cap.y) >= minDistance
      );
    });

    if (candidates.length === 0) {
      return null;
    }

    const idx = Math.floor(Math.random() * candidates.length);
    return candidates[idx];
  }

  async function handleStartGame() {
    console.log('Starting game with:', {
      userId: session?.user?.id,
      nationName: nationName.trim(),
      tilesLoaded: tiles && tiles.length > 0
    });

    if (!session?.user?.id) {
      setError('No user session available. Please log in again.');
      return;
    }

    if (!nationName.trim()) {
      setError('Nation name is required');
      return;
    }

    if (!tiles || tiles.length === 0) {
      setError('Map data not loaded. Please try again.');
      return;
    }

    const { data: existingNation, error: nameCheckError } = await supabase
      .from('nations')
      .select('id')
      .eq('name', nationName.trim())
      .single();

    if (nameCheckError && nameCheckError.code !== 'PGRST116') {
      setError('Failed to check nation name: ' + nameCheckError.message);
      return;
    }

    if (existingNation) {
      setError('Nation name "' + nationName.trim() + '" is already taken. Please choose another.');
      return;
    }

    const capitalTile = findCapitalTile();
    if (!capitalTile) {
      setError('No available tile to place capital.');
      return;
    }

    try {
      console.log('Inserting nation with data:', {
        name: nationName.trim(),
        color: nationColor,
        owner_id: session.user.id,
        capital_tile_x: capitalTile.x,
        capital_tile_y: capitalTile.y
      });

      const { data: nationData, error: insertError } = await supabase
        .from('nations')
        .insert([
          {
            name: nationName.trim(),
            color: nationColor,
            owner_id: session.user.id,
            capital_tile_x: capitalTile.x,
            capital_tile_y: capitalTile.y,
            lumber: 0,
            oil: 0,
            ore: 0
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
        .update({ 
          owner: nationData.id, 
          is_capital: true 
        })
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

      await fetchTiles();
      setUserNation(nationData);
      setResources({
        lumber: nationData.lumber || 0,
        oil: nationData.oil || 0,
        ore: nationData.ore || 0
      });
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
    if (error) {
      setError(error.message);
    } else {
      setLoginEmail('');
      setLoginPassword('');
      fetchTiles();
      setShowMainMenu(false);
      setShowBottomMenu(false);
      setSelectedTile(null);
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
      setError(error.message);
    } else {
      alert('Registration successful! Please check your email to confirm.');
      setRegisterEmail('');
      setRegisterPassword('');
      setRegisterUsername('');
      setShowRegister(false);
      setShowMainMenu(false);
      setShowBottomMenu(false);
      setSelectedTile(null);
    }
  }

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUserNation(null);
      setShowNationModal(false);
      setTiles(null);
      fetchTiles();
      setShowMainMenu(false);
      setShowBottomMenu(false);
      setSelectedTile(null);
    } catch (err) {
      setError('Failed to log out: ' + err.message);
    }
  }

  function getTileBorderClasses(tile) {
    if (!tile.owner || !tile.nations || !tile.nations.color) {
      return '';
    }

    const ownerId = tile.owner;
    const borders = [];

    const tileMap = new Map(tiles.map(t => [`${t.x},${t.y}`, t]));

    const adjacentTiles = [
      { dx: -1, dy: 0, side: 'top' },
      { dx: 1, dy: 0, side: 'bottom' },
      { dx: 0, dy: 1, side: 'right' },
      { dx: 0, dy: -1, side: 'left' },
    ];

    adjacentTiles.forEach(({ dx, dy, side }) => {
      const adjKey = `${tile.x + dx},${tile.y + dy}`;
      const adjacentTile = tileMap.get(adjKey);
      if (!adjacentTile || adjacentTile.owner !== ownerId) {
        borders.push(`border-${side}`);
      }
    });

    return borders.join(' ');
  }

  const formatNumber = (num) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <img src="/icons/building.svg" alt="Empire's Edge" className="header-icon" />
          {session?.user && userNation && (
            <div className="resource-tickers">
              <div className="resource-ticker">
                <span className="resource-icon">🌲</span>
                <span className="resource-value">{formatNumber(resources.lumber)}</span>
              </div>
              <div className="resource-ticker">
                <span className="resource-icon">🛢️</span>
                <span className="resource-value">{formatNumber(resources.oil)}</span>
              </div>
              <div className="resource-ticker">
                <span className="resource-icon">⛏️</span>
                <span className="resource-value">{formatNumber(resources.ore)}</span>
              </div>
            </div>
          )}
        </div>

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
            <User className="profile-icon" title="Profile" />
            <button className="logout-button" onClick={handleLogout} title="Log out">
              <LogOut className="icon" />
            </button>
          </div>
        )}
      </header>

      {error && (
        <div className="error-box" style={{ zIndex: 1004, position: 'fixed', top: '90px', left: '50%', transform: 'translateX(-50%)', background: '#ff4d4d', color: 'white', padding: '10px', borderRadius: '4px' }}>
          {error}
        </div>
      )}

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

      <div>
        <div className="map-scroll-container" ref={mapScrollRef}>
          <div className="map-grid">
            {tiles?.map((tile) => (
              <div
                key={tile.id}
                className={`tile ${tile.type === 'land' ? 'grass' : tile.type} ${tile.is_capital && tile.owner === userNation?.id ? 'capital-highlight' : ''} ${getTileBorderClasses(tile)} ${selectedTile?.id === tile.id ? 'selected-tile' : ''}`}
                data-x={tile.x}
                data-y={tile.y}
                title={`(${tile.x}, ${tile.y}) Type: ${tile.type}, Resource: ${tile.resource || 'None'}, Owner: ${tile.owner_nation_name}, Building: ${tile.building ?? 'None'}`}
                style={tile.owner && tile.nations && tile.nations.color ? { '--nation-color': tile.nations.color } : {}}
                onClick={() => { setShowBottomMenu(true); setSelectedTile(tile); }}
              >
                {tile.is_capital && (
                  <img
                    src="/icons/building.svg"
                    alt="Capital Building"
                    className="capital-icon"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
        {showMainMenu && (
          <div className="main-menu">
            {selectedPage === 'Rankings' && <RankingsPage />}
            {selectedPage === 'OnlinePlayers' && <OnlinePlayersPage />}
            <div
              className="close-menu"
              onClick={() => {
                setShowMainMenu(false);
              }}
              style={{
                position: 'absolute',
                top: '5px',
                right: '5px',
                width: '20px',
                height: '20px',
                background: 'rgba(139, 0, 0, 0.8)',
                color: 'white',
                textAlign: 'center',
                lineHeight: '20px',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'backgroundColor 0.2s ease',
              }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = 'rgba(139, 0, 0, 1)')}
              onMouseLeave={(e) => (e.target.style.backgroundColor = 'rgba(139, 0, 0, 0.8)')}
            >
              X
            </div>
          </div>
        )}
        {showBottomMenu && (
          <div className="bottom-menu">
            <TileInformationPage
              selectedTile={selectedTile}
              userNation={userNation}
              setError={setError}
              fetchTiles={fetchTiles}
              setSelectedTile={setSelectedTile}
              tiles={tiles}
            />
            <div
              className="close-menu"
              onClick={() => {
                setShowBottomMenu(false);
                setSelectedTile(null);
              }}
              style={{
                position: 'absolute',
                top: '5px',
                right: '5px',
                width: '20px',
                height: '20px',
                background: 'rgba(139, 0, 0, 0.8)',
                color: 'white',
                textAlign: 'center',
                lineHeight: '20px',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'backgroundColor 0.2s ease',
              }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = 'rgba(139, 0, 0, 1)')}
              onMouseLeave={(e) => (e.target.style.backgroundColor = 'rgba(139, 0, 0, 0.8)')}
            >
              X
            </div>
          </div>
        )}
        <div className="left-menu">
          <div onClick={() => { setSelectedPage('Rankings'); setShowMainMenu(true); }}>Rankings</div><br />
          <div onClick={() => { setSelectedPage('OnlinePlayers'); setShowMainMenu(true); }}>Online Players</div><br />
          <div>Messages</div><br />
          <div>Forum</div><br />
          <div>My Nation</div><br />
          <div>Infrastructure</div><br />
          <div>Diplomacy</div>
        </div>
      </div>

      {tiles === null && !error && <div className="loading-message">Loading map data...</div>}
      <Analytics />
    </div>
  );
}

export default App;