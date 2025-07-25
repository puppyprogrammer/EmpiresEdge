import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import './index.css';
import initializeGameState from './helpers/gameLogic/initializeGameState';
import renderAppUI from './helpers/gameLogic/renderAppUI.jsx';
import { handleStartGame } from './helpers/gameLogic/handleStartGame.js';
import { findCapitalTile } from './helpers/gameLogic/findCapitalTile.js';
import { handleLogin, handleRegister, handleLogout } from './helpers/auth/authHandlers.js';

const supabaseUrl = 'https://kbiaueussvcshwlvaabu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiaWF1ZXVzc3Zjc2h3bHZhYWJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NTU1MDYsImV4cCI6MjA2ODMzMTUwNn0.MJ82vub25xntWjRaK1hS_37KwdDeckPQkZDF4bzZC3U';
const supabase = createClient(supabaseUrl, supabaseKey);

function App() {
  const mapScrollRef = useRef(null);
  const staticTilesRef = useRef({});
  const subscriptionRef = useRef(null);
  const lastNationRef = useRef(null);
  const lastResourcesRef = useRef({ lumber: 0, oil: 0, ore: 0 });
  const hasInitialized = useRef(false);
  const TILE_SIZE = 32;

  const [gameState, setGameState] = useState({
    dynamicTiles: {},
    nations: {},
    userNation: null,
    resources: { lumber: 0, oil: 0, ore: 0 },
    version: null,
    tileTypes: {},
    resourceTypes: {},
    buildingTypes: {},
  });
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
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

  const nationsMemo = useMemo(() => JSON.parse(JSON.stringify(gameState.nations)), [gameState.nations]);

  const debounce = (fn, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
  };

  const debouncedSetSelectedTile = useCallback(
    debounce((tile) => {
      setSelectedTile(tile);
      setShowBottomMenu(true);
    }, 100),
    []
  );

  const updateSingleTile = async (tileId, updates) => {
    try {
      if (!tileId || !tileId.includes('_')) {
        setError('Invalid tile ID format');
        return;
      }
      const { x, y } = staticTilesRef.current[tileId] || {};
      if (!x || !y) {
        setError('Tile not found');
        return;
      }

      const { data, error } = await supabase
        .from('tiles')
        .update(updates)
        .eq('x', x)
        .eq('y', y)
        .select()
        .single();

      if (error) {
        setError('Failed to update tile: ' + error.message);
        return;
      }

      const owner_nation_name = data.owner ? gameState.nations[data.owner]?.name || 'None' : 'None';
      const nations = data.owner ? gameState.nations[data.owner] : null;

      setGameState((prevState) => ({
        ...prevState,
        dynamicTiles: {
          ...prevState.dynamicTiles,
          [tileId]: {
            ...prevState.dynamicTiles[tileId],
            owner: data.owner || null,
            building: data.building || null,
            owner_nation_name,
            nations,
            is_capital: data.is_capital || false,
          },
        },
      }));

      if (selectedTile?.id === tileId) {
        setSelectedTile((prev) => ({
          ...prev,
          owner: data.owner || null,
          building: data.building || null,
          owner_nation_name,
          nations,
          is_capital: data.is_capital || false,
        }));
      }
    } catch (err) {
      setError('Error updating tile: ' + err.message);
    }
  };

  const getTileTypeClass = (typeId) => {
    const name = gameState.tileTypes[typeId]?.name || 'unknown';
    return name === 'plain' ? 'grass' : name;
  };

  const getBuildingName = (buildingId) => {
    return gameState.buildingTypes[buildingId]?.name || null;
  };

  const getResourceName = (resourceId) => {
    return gameState.resourceTypes[resourceId]?.name || null;
  };

  const getTileBorderClasses = (tile) => {
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
      if (!adjacentTile || adjacentTile.owner !== tile.owner) {
        borders.push(`border-${side}`);
      }
    });
    return borders.join(' ');
  };

  const getRoadShape = useCallback(
    (tile) => {
      const buildingName = getBuildingName(tile.building);
      if (!buildingName || buildingName !== 'road') return null;

      const adjacentTiles = [
        { dx: 0, dy: -1, dir: 'top' },
        { dx: 0, dy: 1, dir: 'bottom' },
        { dx: 1, dy: 0, dir: 'right' },
        { dx: -1, dy: 0, dir: 'left' },
      ];

      const roadNeighbors = adjacentTiles
        .filter(({ dx, dy }) => {
          const adjKey = `${tile.x + dx}_${tile.y + dy}`;
          const adjTile = gameState.dynamicTiles[adjKey];
          return adjTile && getBuildingName(adjTile.building) === 'road';
        })
        .map(({ dir }) => dir);

      const count = roadNeighbors.length;

      if (count === 0) {
        return <circle cx="16" cy="16" r="4" fill="#808080" />;
      } else if (count === 1) {
        const dir = roadNeighbors[0];
        if (dir === 'top') {
          return <line x1="16" y1="0" x2="16" y2="16" stroke="#808080" strokeWidth="4" />;
        } else if (dir === 'bottom') {
          return <line x1="16" y1="16" x2="16" y2="32" stroke="#808080" strokeWidth="4" />;
        } else if (dir === 'right') {
          return <line x1="16" y1="16" x2="32" y2="16" stroke="#808080" strokeWidth="4" />;
        } else {
          return <line x1="0" y1="16" x2="16" y2="16" stroke="#808080" strokeWidth="4" />;
        }
      } else if (count === 2) {
        if (roadNeighbors.includes('top') && roadNeighbors.includes('bottom')) {
          return <line x1="16" y1="0" x2="16" y2="32" stroke="#808080" strokeWidth="4" />;
        } else if (roadNeighbors.includes('left') && roadNeighbors.includes('right')) {
          return <line x1="0" y1="16" x2="32" y2="16" stroke="#808080" strokeWidth="4" />;
        } else {
          const [dir1, dir2] = roadNeighbors;
          let startX, startY, endX, endY, controlX, controlY;
          if (roadNeighbors.includes('top')) {
            startX = 16;
            startY = 0;
            controlY = 12;
            if (dir1 === 'right' || dir2 === 'right') {
              endX = 32;
              endY = 16;
              controlX = 20;
            } else {
              endX = 0;
              endY = 16;
              controlX = 12;
            }
          } else if (roadNeighbors.includes('bottom')) {
            startX = 16;
            startY = 32;
            controlY = 20;
            if (dir1 === 'right' || dir2 === 'right') {
              endX = 32;
              endY = 16;
              controlX = 20;
            } else {
              endX = 0;
              endY = 16;
              controlX = 12;
            }
          } else {
            startX = 0;
            startY = 16;
            controlX = 12;
            endX = 32;
            endY = 16;
            controlY = 20;
          }
          return (
            <path
              d={`M${startX},${startY} Q${controlX},${controlY} ${endX},${endY}`}
              stroke="#808080"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
            />
          );
        }
      } else if (count === 3) {
        const missingDir = ['top', 'bottom', 'left', 'right'].find((dir) => !roadNeighbors.includes(dir));
        if (missingDir === 'top') {
          return (
            <>
              <line x1="16" y1="16" x2="16" y2="32" stroke="#808080" strokeWidth="4" />
              <line x1="0" y1="16" x2="32" y2="16" stroke="#808080" strokeWidth="4" />
            </>
          );
        } else if (missingDir === 'bottom') {
          return (
            <>
              <line x1="16" y1="0" x2="16" y2="16" stroke="#808080" strokeWidth="4" />
              <line x1="0" y1="16" x2="32" y2="16" stroke="#808080" strokeWidth="4" />
            </>
          );
        } else if (missingDir === 'right') {
          return (
            <>
              <line x1="0" y1="16" x2="16" y2="16" stroke="#808080" strokeWidth="4" />
              <line x1="16" y1="0" x2="16" y2="32" stroke="#808080" strokeWidth="4" />
            </>
          );
        } else {
          return (
            <>
              <line x1="16" y1="16" x2="32" y2="16" stroke="#808080" strokeWidth="4" />
              <line x1="16" y1="0" x2="16" y2="32" stroke="#808080" strokeWidth="4" />
            </>
          );
        }
      } else {
        return (
          <>
            <line x1="16" y1="0" x2="16" y2="32" stroke="#808080" strokeWidth="4" />
            <line x1="0" y1="16" x2="32" y2="16" stroke="#808080" strokeWidth="4" />
          </>
        );
      }
    },
    [gameState.dynamicTiles, gameState.buildingTypes]
  );

  const handleStartGameWrapper = () => {
    handleStartGame({
      session,
      nationName,
      nationColor,
      staticTilesRef,
      gameState,
      setShowNationModal,
      setNationName,
      setError,
      initializeGameState: handleInit,
      findCapitalTile,
      supabase,
    });
  };

  const handleInit = () => {
    initializeGameState({
      supabase,
      staticTilesRef,
      setGameState,
      setLoading,
      setIsInitialized,
      setError,
      setShowNationModal,
      lastNationRef,
      lastResourcesRef,
      session,
      hasInitialized,
    });
  };

  useEffect(() => {
    (async () => {
      if (hasInitialized.current) return;
      setLoading(true);
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      handleInit();
    })();
  }, []);

  useEffect(() => {
    if (!session?.user?.id || loading) return;

    const updateResources = async () => {
      try {
        const { data: nationData, error: nationError } = await supabase
          .from('nations')
          .select('id, name, color, capital_tile_x, capital_tile_y, owner_id, lumber, oil, ore')
          .eq('owner_id', session.user.id)
          .maybeSingle();

        if (nationError) {
          setError('Failed to fetch nation: ' + nationError.message);
          setShowNationModal(true);
          return;
        }

        if (!nationData) {
          setShowNationModal(true);
          return;
        }

        const { data, error } = await supabase.rpc('update_resources', { user_id: session.user.id });

        if (error) {
          setError('Failed to update resources: ' + error.message);
          return;
        }

        if (data && data.length > 0) {
          const newNation = data[0];
          const newResources = {
            lumber: newNation.lumber || 0,
            oil: newNation.oil || 0,
            ore: newNation.ore || 0,
          };

          const resourcesUnchanged =
            lastResourcesRef.current.lumber === newResources.lumber &&
            lastResourcesRef.current.oil === newResources.oil &&
            lastResourcesRef.current.ore === newResources.ore;
          const nationUnchanged =
            lastNationRef.current &&
            lastNationRef.current.id === newNation.id &&
            lastNationRef.current.name === newNation.name &&
            lastNationRef.current.color === newNation.color &&
            lastNationRef.current.capital_tile_x === newNation.capital_tile_x &&
            lastNationRef.current.capital_tile_y === newNation.capital_tile_y &&
            lastNationRef.current.owner_id === newNation.owner_id &&
            lastNationRef.current.lumber === newNation.lumber &&
            lastNationRef.current.oil === newNation.oil &&
            lastNationRef.current.ore === newNation.ore;

          if (resourcesUnchanged && nationUnchanged) return;

          setGameState((prevState) => ({
            ...prevState,
            userNation: newNation,
            resources: newResources,
          }));
          lastNationRef.current = newNation;
          lastResourcesRef.current = newResources;
          setShowNationModal(false);
        } else {
          setShowNationModal(true);
        }
      } catch (err) {
        setError('Failed to update resources: ' + err.message);
      }
    };

    updateResources();
    if (gameState.userNation) {
      const interval = setInterval(updateResources, 3000);
      return () => clearInterval(interval);
    }
  }, [session?.user?.id, loading, gameState.userNation]);

  useEffect(() => {
    if (!session?.user?.id || loading) return;

    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
    }

    let tileUpdates = [];
    const flushUpdates = debounce(() => {
      if (tileUpdates.length === 0) return;
      setGameState((prevState) => {
        if (!prevState) return prevState;
        const newDynamicTiles = { ...prevState.dynamicTiles };
        tileUpdates.forEach(({ key, owner, building, owner_nation_name, is_capital }) => {
          const currentTile = newDynamicTiles[key] || {};
          if (
            currentTile.owner === owner &&
            currentTile.building === building &&
            currentTile.is_capital === is_capital &&
            currentTile.owner_nation_name === owner_nation_name
          ) {
            return;
          }
          newDynamicTiles[key] = {
            owner,
            building,
            owner_nation_name,
            nations: owner && prevState.nations[owner] ? prevState.nations[owner] : null,
            is_capital,
          };
        });
        tileUpdates = [];
        return { ...prevState, dynamicTiles: newDynamicTiles };
      });
    }, 500);

    const subscription = supabase
      .channel('game_state_changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tiles' },
        async (payload) => {
          try {
            const key = `${payload.new.x}_${payload.new.y}`;
            const owner_nation_name = payload.new.owner ? gameState.nations[payload.new.owner]?.name || 'None' : 'None';
            tileUpdates.push({
              key,
              owner: payload.new.owner || null,
              building: payload.new.building || null,
              owner_nation_name,
              is_capital: payload.new.is_capital || false,
            });
            flushUpdates();
            if (selectedTile?.x === payload.new.x && selectedTile?.y === payload.new.y) {
              const newTile = {
                ...staticTilesRef.current[key],
                owner: payload.new.owner || null,
                building: payload.new.building || null,
                owner_nation_name,
                nations: payload.new.owner && gameState.nations[payload.new.owner] ? gameState.nations[payload.new.owner] : null,
                is_capital: payload.new.is_capital || false,
                id: key,
              };
              if (
                selectedTile.owner === newTile.owner &&
                selectedTile.building === newTile.building &&
                selectedTile.is_capital === newTile.is_capital &&
                selectedTile.owner_nation_name === newTile.owner_nation_name
              ) {
                return;
              }
              setSelectedTile(newTile);
            }
          } catch (err) {
            setError('Error processing tile update: ' + err.message);
          }
        }
      )
      .subscribe();

    subscriptionRef.current = subscription;

    return () => {
      supabase.removeChannel(subscription);
      flushUpdates.clear();
    };
  }, [session?.user?.id, loading, gameState.nations]);

  useEffect(() => {
    let timeoutId = null;
    const handleAuthChange = async (event, session) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        setSession(session);
        if (!session && !hasInitialized.current) {
          setGameState((prevState) => ({
            ...prevState,
            userNation: null,
            resources: { lumber: 0, oil: 0, ore: 0 },
          }));
          lastNationRef.current = null;
          lastResourcesRef.current = { lumber: 0, oil: 0, ore: 0 };
          setShowNationModal(false);
          setShowMainMenu(false);
          setShowBottomMenu(false);
          setSelectedTile(null);
          handleInit();
        } else if (session && !hasInitialized.current) {
          handleInit();
        }
      }, 300);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (loading || !mapScrollRef.current || Object.keys(gameState.dynamicTiles).length === 0) return;

    if (gameState?.userNation) {
      const { capital_tile_x, capital_tile_y } = gameState.userNation;
      const key = `${capital_tile_x}_${capital_tile_y}`;
      const capitalTile = gameState.dynamicTiles[key];

      if (!capitalTile || !staticTilesRef.current[key] || !capitalTile.is_capital) return;

      const container = mapScrollRef.current;
      const capitalPixelX = capital_tile_x * TILE_SIZE;
      const capitalPixelY = capital_tile_y * TILE_SIZE;

      container.scrollTo({
        left: capitalPixelX - container.clientWidth / 2 + TILE_SIZE / 2,
        top: capitalPixelY - container.clientHeight / 2 + TILE_SIZE / 2,
        behavior: 'smooth',
      });

      const tileEl = document.querySelector(`.tile[data-x="${capital_tile_x}"][data-y="${capital_tile_y}"]`);
      if (tileEl) tileEl.classList.add('capital-highlight');

      let timeoutId = null;
      const resetTimer = () => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          container.scrollTo({
            left: capitalPixelX - container.clientWidth / 2 + TILE_SIZE / 2,
            top: capitalPixelY - container.clientHeight / 2 + TILE_SIZE / 2,
            behavior: 'smooth',
          });
        }, 4000);
      };

      const handleInteraction = () => resetTimer();

      container.addEventListener('scroll', handleInteraction);
      container.addEventListener('mousedown', handleInteraction);
      container.addEventListener('touchstart', handleInteraction);

      return () => {
        if (timeoutId) clearTimeout(timeoutId);
        container.removeEventListener('scroll', handleInteraction);
        container.removeEventListener('mousedown', handleInteraction);
        container.removeEventListener('touchstart', handleInteraction);
      };
    } else {
      mapScrollRef.current.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
    }
  }, [gameState?.userNation, loading, gameState.dynamicTiles]);

  const formatNumber = (num) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  const renderedTiles = useMemo(() => {
    if (loading) return [];
    return Object.keys(staticTilesRef.current)
      .map((key) => {
        const staticTile = staticTilesRef.current[key];
        const dynamicTile = gameState.dynamicTiles[key] || {};
        const tile = { ...staticTile, ...dynamicTile, id: key };
        if (typeof tile.x !== 'number' || typeof tile.y !== 'number') return null;
        return tile;
      })
      .filter((tile) => tile !== null)
      .sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y));
  }, [gameState.dynamicTiles, loading]);

  return renderAppUI({
    loading,
    isInitialized,
    showNationModal,
    session,
    gameState,
    error,
    nationName,
    setNationName,
    nationColor,
    setNationColor,
    handleStartGameWrapper,
    showRegister,
    handleLogin: (e) => handleLogin({
      e,
      supabase,
      loginEmail,
      loginPassword,
      setError,
      setLoginEmail,
      setLoginPassword,
      setShowMainMenu,
      setShowBottomMenu,
      setSelectedTile,
    }),
    loginEmail,
    setLoginEmail,
    loginPassword,
    setLoginPassword,
    handleRegister: (e) => handleRegister({
      e,
      supabase,
      registerEmail,
      registerPassword,
      registerUsername,
      setError,
      setRegisterEmail,
      setRegisterPassword,
      setRegisterUsername,
      setShowRegister,
      setShowMainMenu,
      setShowBottomMenu,
      setSelectedTile,
    }),
    registerEmail,
    setRegisterEmail,
    registerUsername,
    setRegisterUsername,
    registerPassword,
    setRegisterPassword,
    setShowRegister,
    setError,
    handleLogout: () => handleLogout({
      supabase,
      setSession,
      setGameState,
      lastNationRef,
      lastResourcesRef,
      setShowNationModal,
      setShowMainMenu,
      setShowBottomMenu,
      setSelectedTile,
      setError,
      hasInitialized,
      handleInit,
    }),
    formatNumber,
    renderedTiles,
    selectedTile,
    debouncedSetSelectedTile,
    showMainMenu,
    selectedPage,
    setSelectedPage,
    setShowMainMenu,
    showBottomMenu,
    setShowBottomMenu,
    setSelectedTile,
    mapScrollRef,
    supabase,
    TILE_SIZE,
    updateSingleTile,
    getTileTypeClass,
    getTileBorderClasses,
    getResourceName,
    getBuildingName,
    getRoadShape,
  });
}

export default App;