import { useState, useEffect, useRef, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import './index.css';
import { User, LogOut } from 'lucide-react';
import { Analytics } from "@vercel/analytics/react";
import RankingsPage from './RankingsPage';
import OnlinePlayersPage from './OnlinePlayersPage';
import TileInformationPage from './TileInformationPage';

const supabaseUrl = 'https://kbiaueussvcshwlvaabu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiaWF1ZXVzc3Zjc2h3bHZhYWJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NTU1MDYsImV4cCI6MjA2ODMzMTUwNn0.MJ82vub25xntWjRaK1hS_37KwdDeckPQkZDF4bzZC3U';
const supabase = createClient(supabaseUrl, supabaseKey);

function App() {
  const mapScrollRef = useRef(null);
  const staticTilesRef = useRef({});
  const TILE_SIZE = 32;

  const [gameState, setGameState] = useState({
    dynamicTiles: {},
    nations: {},
    userNation: null,
    resources: { lumber: 0, oil: 0, ore: 0 },
    version: null,
  });
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [showNationModal, setShowNationModal] = useState(false);
  const [nationName, setNationName] = useState('');
  const [nationColor, setNationColor] = useState('#2563eb');
  const [showMainMenu, setShowMainMenu] = useState(false);
  const [showBottomMenu, setShowBottomMenu] = useState(false);
  const [selectedPage, setSelectedPage] = useState(null);
  const [selectedTile, setSelectedTile] = useState(null);

  // Initialize game state
  const initializeGameState = async () => {
    try {
      setLoading(true);
      const [gameStateRes, resourcesRes] = await Promise.all([
        supabase.rpc('fetch_game_state'),
        session?.user?.id
          ? supabase.rpc('update_resources', { user_id: session.user.id }).single()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (gameStateRes.error) {
        console.error('Failed to fetch game state:', gameStateRes.error);
        setError(`Failed to load map data: ${gameStateRes.error.message}. Please try refreshing or disabling ad blockers.`);
        setLoading(false);
        return;
      }

      if (!gameStateRes.data?.tiles || !gameStateRes.data?.nations) {
        console.warn('Incomplete game state data:', {
          tiles: !!gameStateRes.data?.tiles,
          nations: !!gameStateRes.data?.nations,
        });
        setError('Incomplete map data received. Please try refreshing.');
        setLoading(false);
        return;
      }

      if (resourcesRes.error && resourcesRes.error.code !== 'PGRST116') {
        console.error('Failed to update resources:', resourcesRes.error);
        setError('Failed to update resources: ' + resourcesRes.error.message);
        setLoading(false);
        return;
      }

      const staticTiles = {};
      const dynamicTiles = {};
      gameStateRes.data.tiles.forEach((tile) => {
        if (typeof tile.x !== 'number' || typeof tile.y !== 'number') {
          console.warn('Invalid tile data:', tile);
          return;
        }
        staticTiles[`${tile.x}_${tile.y}`] = {
          x: tile.x,
          y: tile.y,
          type: tile.type,
          resource: tile.resource || null,
        };
        dynamicTiles[`${tile.x}_${tile.y}`] = {
          owner: tile.owner || null,
          building: tile.building || null,
          owner_nation_name: tile.owner && gameStateRes.data.nations[tile.owner] ? gameStateRes.data.nations[tile.owner].name || 'None' : 'None',
          nations: tile.owner && gameStateRes.data.nations[tile.owner] ? gameStateRes.data.nations[tile.owner] : null,
          is_capital: tile.is_capital || false,
        };
      });

      staticTilesRef.current = staticTiles;
      setGameState({
        dynamicTiles,
        nations: gameStateRes.data.nations,
        userNation: resourcesRes.data || null,
        resources: resourcesRes.data
          ? { lumber: resourcesRes.data.lumber || 0, oil: resourcesRes.data.oil || 0, ore: resourcesRes.data.ore || 0 }
          : { lumber: 0, oil: 0, ore: 0 },
        version: gameStateRes.data.version,
      });
      setShowNationModal(!resourcesRes.data);
      setLoading(false);
    } catch (err) {
      console.error('Error in initializeGameState:', err);
      setError(`Error loading game data: ${err.message}. Please try refreshing or disabling ad blockers.`);
      setLoading(false);
    }
  };

  // Session check and initial load
  useEffect(() => {
    async function checkSessionAndInitialize() {
      try {
        setLoading(true);
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
        if (data.session) {
          await initializeGameState();
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Error checking session:', err);
        setError(`Error initializing app: ${err.message}. Please try refreshing.`);
        setLoading(false);
      }
    }

    checkSessionAndInitialize();
  }, []);

  // Resource tick and database listeners
  useEffect(() => {
    if (!session?.user?.id || loading) return;

    const updateResources = async () => {
      try {
        const { data, error } = await supabase
          .rpc('update_resources', { user_id: session.user.id })
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Failed to update resources:', error);
          setError('Failed to update resources: ' + error.message);
          return;
        }

        if (data) {
          setGameState((prev) => ({
            ...prev,
            userNation: {
              id: data.id,
              name: data.name,
              color: data.color,
              capital_tile_x: data.capital_tile_x,
              capital_tile_y: data.capital_tile_y,
              owner_id: data.owner_id,
              lumber: data.lumber,
              oil: data.oil,
              ore: data.ore,
            },
            resources: {
              lumber: data.lumber || 0,
              oil: data.oil || 0,
              ore: data.ore || 0,
            },
          }));
          setShowNationModal(false);
        } else {
          setGameState((prev) => ({
            ...prev,
            userNation: null,
            resources: { lumber: 0, oil: 0, ore: 0 },
          }));
          setShowNationModal(true);
        }
      } catch (err) {
        console.error('Error in updateResources:', err);
        setError('Failed to update resources: ' + err.message);
      }
    };

    updateResources();
    const interval = setInterval(updateResources, 3000);

    const ownership_building_tile_update = supabase
      .channel('game_state_changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tiles' },
        (payload) => {
          setGameState((prev) => {
            if (!prev.nations) return prev;
            const updatedTile = {
              owner: payload.new.owner || null,
              building: payload.new.building || null,
              owner_nation_name: payload.new.owner ? prev.nations[payload.new.owner]?.name || 'None' : 'None',
              nations: payload.new.owner ? prev.nations[payload.new.owner] : null,
              is_capital: payload.new.is_capital || false,
            };
            const key = `${payload.new.x}_${payload.new.y}`;
            const newDynamicTiles = { ...prev.dynamicTiles, [key]: updatedTile };

            const adjacentKeys = [
              `${payload.new.x - 1}_${payload.new.y}`,
              `${payload.new.x + 1}_${payload.new.y}`,
              `${payload.new.x}_${payload.new.y + 1}`,
              `${payload.new.x}_${payload.new.y - 1}`,
            ];
            adjacentKeys.forEach((adjKey) => {
              if (newDynamicTiles[adjKey]) {
                newDynamicTiles[adjKey] = { ...newDynamicTiles[adjKey] };
              }
            });

            if (selectedTile && selectedTile.id === payload.new.id) {
              setSelectedTile({
                ...staticTilesRef.current[key],
                ...updatedTile,
                id: payload.new.id,
              });
            }

            return { ...prev, dynamicTiles: newDynamicTiles };
          });
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(ownership_building_tile_update);
    };
  }, [session?.user?.id, loading]);

  // Auth state change listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        setGameState({
          dynamicTiles: {},
          nations: {},
          userNation: null,
          resources: { lumber: 0, oil: 0, ore: 0 },
          version: null,
        });
        staticTilesRef.current = {};
        setShowNationModal(false);
        setShowMainMenu(false);
        setShowBottomMenu(false);
        setSelectedTile(null);
        setLoading(false);
      } else {
        initializeGameState();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Map centering
  useEffect(() => {
    if (!gameState?.userNation || !Object.keys(gameState.dynamicTiles).length || !mapScrollRef.current || loading) {
      return;
    }

    const capitalTile = Object.values(gameState.dynamicTiles).find(
      (tile) =>
        staticTilesRef.current[`${gameState.userNation.capital_tile_x}_${gameState.userNation.capital_tile_y}`] &&
        tile.is_capital &&
        gameState.userNation.capital_tile_x === staticTilesRef.current[`${gameState.userNation.capital_tile_x}_${gameState.userNation.capital_tile_y}`].x &&
        gameState.userNation.capital_tile_y === staticTilesRef.current[`${gameState.userNation.capital_tile_x}_${gameState.userNation.capital_tile_y}`].y
    );
    if (!capitalTile) {
      return;
    }

    const container = mapScrollRef.current;
    const capitalPixelX = gameState.userNation.capital_tile_x * TILE_SIZE;
    const capitalPixelY = gameState.userNation.capital_tile_y * TILE_SIZE;

    let timeoutId = null;

    const centerMap = () => {
      container.scrollTo({
        left: capitalPixelX - (container.clientWidth / 2) + (TILE_SIZE / 2),
        top: capitalPixelY - (container.clientHeight / 2) + (TILE_SIZE / 2),
        behavior: 'smooth',
      });

      const tileEl = document.querySelector(`.tile[data-x="${gameState.userNation.capital_tile_x}"][data-y="${gameState.userNation.capital_tile_y}"]`);
      if (tileEl) {
        tileEl.classList.add('capital-highlight');
      }
    };

    const resetTimer = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(centerMap, 4000);
    };

    resetTimer();

    const handleInteraction = () => {
      resetTimer();
    };

    container.addEventListener('scroll', handleInteraction);
    container.addEventListener('mousedown', handleInteraction);
    container.addEventListener('touchstart', handleInteraction);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      container.removeEventListener('scroll', handleInteraction);
      container.removeEventListener('mousedown', handleInteraction);
      container.removeEventListener('touchstart', handleInteraction);
    };
  }, [gameState?.userNation, gameState?.dynamicTiles, loading]);

  async function handleStartGame() {
    if (!session?.user?.id) {
      setError('No user session available. Please log in again.');
      return;
    }

    if (!nationName.trim()) {
      setError('Nation name is required');
      return;
    }

    if (!Object.keys(staticTilesRef.current).length) {
      setError('Map data not loaded. Please try again.');
      return;
    }

    try {
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

      const { data: nationData, error: insertError } = await supabase
        .rpc('create_nation', {
          user_id: session.user.id,
          nation_name: nationName.trim(),
          nation_color: nationColor,
          capital_x: capitalTile.x,
          capital_y: capitalTile.y,
        })
        .single();

      if (insertError) {
        setError('Failed to create nation: ' + insertError.message);
        return;
      }

      setShowNationModal(false);
      await initializeGameState();
      setNationName('');
    } catch (err) {
      setError('Error creating nation: ' + err.message);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      if (error) {
        setError(error.message);
      } else {
        setLoginEmail('');
        setLoginPassword('');
        setShowMainMenu(false);
        setShowBottomMenu(false);
        setSelectedTile(null);
      }
    } catch (err) {
      setError('Failed to log in: ' + err.message);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError(null);
    try {
      const { error } = await supabase.auth.signUp({
        email: registerEmail,
        password: registerPassword,
        options: { data: { username: registerUsername } },
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
    } catch (err) {
      setError('Failed to register: ' + err.message);
    }
  }

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
      setSession(null);
      setGameState({
        dynamicTiles: {},
        nations: {},
        userNation: null,
        resources: { lumber: 0, oil: 0, ore: 0 },
        version: null,
      });
      staticTilesRef.current = {};
      setShowNationModal(false);
      setShowMainMenu(false);
      setShowBottomMenu(false);
      setSelectedTile(null);
      setLoading(false);
    } catch (err) {
      setError('Failed to log out: ' + err.message);
    }
  }

  function getTileBorderClasses(tile) {
    if (!tile.owner || !tile.nations || !tile.nations.color) {
      return '';
    }

    const borders = [];
    const adjacentTiles = [
      { dx: 0, dy: -1, side: 'top' },
      { dx: 0, dy: 1, side: 'bottom' },
      { dx: 1, dy: 0, side: 'right' },
      { dx: -1, dy: 0, side: 'left' },
    ];

    adjacentTiles.forEach(({ dx, dy, side }) => {
      const adjKey = `${tile.x + dx}_${tile.y + dy}`;
      const adjacentTile = gameState.dynamicTiles[adjKey];
      const isDifferentOwner = !adjacentTile || adjacentTile.owner !== tile.owner;
      if (isDifferentOwner) {
        borders.push(`border-${side}`);
      }
    });
    return borders.join(' ');
  }

  function tilesWithinDistance(centerTile, distance, tilesMap) {
    return Object.values(tilesMap).filter(
      (tile) => Math.abs(tile.x - centerTile.x) + Math.abs(tile.y - centerTile.y) <= distance
    );
  }

  function findCapitalTile() {
    if (!Object.keys(staticTilesRef.current).length) {
      return null;
    }
    const capitalTiles = Object.values(gameState.dynamicTiles).filter(
      (tile) => tile.is_capital === true
    );

    const minDistance = 3;
    const candidates = Object.values(staticTilesRef.current).filter((tile) => {
      if (tile.x === undefined || tile.y === undefined) return false;
      return capitalTiles.every(
        (cap) => {
          const staticTile = staticTilesRef.current[`${cap.x}_${cap.y}`];
          return staticTile && Math.abs(tile.x - staticTile.x) + Math.abs(tile.y - staticTile.y) >= minDistance;
        }
      );
    });

    if (candidates.length === 0) return null;
    const idx = Math.floor(Math.random() * candidates.length);
    return candidates[idx];
  }

  const formatNumber = (num) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  const renderedTiles = useMemo(() => {
    if (loading) return [];
    return Object.keys(staticTilesRef.current)
      .map((key) => {
        const staticTile = staticTilesRef.current[key];
        const dynamicTile = gameState.dynamicTiles[key] || {};
        const tile = {
          ...staticTile,
          ...dynamicTile,
          id: key,
        };
        if (typeof tile.x !== 'number' || typeof tile.y !== 'number') {
          console.warn('Invalid tile in renderedTiles:', tile);
        }
        return tile;
      })
      .sort((a, b) => a.y === b.y ? a.x - b.x : a.y - b.y);
  }, [gameState.dynamicTiles, loading]);

  if (loading) {
    return (
      <div className="loading-screen" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#1a1a1a',
        color: 'white',
        fontSize: '1.5rem',
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <img src="/icons/building.svg" alt="Empire's Edge" className="header-icon" />
          {session?.user && gameState?.userNation && (
            <div className="resource-tickers">
              <div className="resource-ticker">
                <span className="resource-icon">🌲</span>
                <span className="resource-value">{formatNumber(gameState.resources.lumber)}</span>
              </div>
              <div className="resource-ticker">
                <span className="resource-icon">🛢️</span>
                <span className="resource-value">{formatNumber(gameState.resources.oil)}</span>
              </div>
              <div className="resource-ticker">
                <span className="resource-icon">⛏️</span>
                <span className="resource-value">{formatNumber(gameState.resources.ore)}</span>
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
            <button type="submit" className="button">LOGIN</button>
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
            <button type="submit" className="button">REGISTER</button>
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
        <div
          className="error-box"
          style={{
            zIndex: 1004,
            position: 'fixed',
            top: '90px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#ff4d4d',
            color: 'white',
            padding: '10px',
            borderRadius: '4px',
          }}
        >
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
            {renderedTiles.map((tile) => (
              <div
                key={tile.id}
                className={`tile ${tile.type === 'land' ? 'grass' : tile.type} ${
                  tile.is_capital && tile.owner === gameState?.userNation?.id ? 'capital-highlight' : ''
                } ${getTileBorderClasses(tile)} ${selectedTile?.id === tile.id ? 'selected-tile' : ''}`}
                data-x={tile.x}
                data-y={tile.y}
                title={`(${tile.x}, ${tile.y}) Type: ${tile.type}, Resource: ${
                  tile.resource || 'None'
                }, Owner: ${tile.owner_nation_name || 'None'}, Building: ${tile.building || 'None'}`}
                style={tile.owner && tile.nations && tile.nations.color ? { '--nation-color': tile.nations.color } : {}}
                onClick={() => {
                  console.log('Selected tile:', tile);
                  setShowBottomMenu(true);
                  setSelectedTile(tile);
                }}
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
              onClick={() => setShowMainMenu(false)}
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
              userNation={gameState?.userNation}
              setError={setError}
              fetchTiles={initializeGameState}
              setSelectedTile={setSelectedTile}
              tiles={gameState?.dynamicTiles}
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

      <Analytics />
    </div>
  );
}

export default App;