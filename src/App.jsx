import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import './index.css';
import { User, LogOut } from 'lucide-react';
import RankingsPage from './RankingsPage';
import OnlinePlayersPage from './OnlinePlayersPage';
import TileInformationPage from './TileInformationPage';
import { findCapitalTile } from './helpers/gameLogic/findCapitalTile.js';
import { handleStartGame } from './helpers/gameLogic/handleStartGame.js';

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
  const renderCount = useRef(0);

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

  // Deep memoize nations to prevent unnecessary subscription triggers
  const nationsMemo = useMemo(() => {
    const nationsString = JSON.stringify(gameState.nations);
    return JSON.parse(nationsString);
  }, [gameState.nations]);

  // Debounce function
  const debounce = (fn, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
  };

  // Debounce setSelectedTile to reduce renders from rapid clicks
  const debouncedSetSelectedTile = useCallback(
    debounce((tile) => {
      console.log('setSelectedTile called:', { ...tile });
      setSelectedTile(tile);
      setShowBottomMenu(true);
    }, 100),
    []
  );

  // Update single tile function
  const updateSingleTile = async (tileId, updates) => {
    try {
      console.log('updateSingleTile called:', { tileId, updates, staticTileCount: Object.keys(staticTilesRef.current).length });
      if (!tileId || !tileId.includes('_')) {
        console.error('Invalid tileId format in updateSingleTile:', { tileId, expected: 'x_y', availableKeys: Object.keys(staticTilesRef.current).slice(0, 5) });
        setError('Invalid tile ID format');
        return;
      }
      const { x, y } = staticTilesRef.current[tileId] || {};
      if (!x || !y) {
        console.error('Tile not found in staticTilesRef:', {
          tileId,
          x,
          y,
          staticKeys: Object.keys(staticTilesRef.current).slice(0, 5),
        });
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
        console.error('Failed to update tile in Supabase:', { ...error });
        setError('Failed to update tile: ' + error.message);
        return;
      }

      let owner_nation_name = 'None';
      if (data.owner) {
        const { data: nationData, error: nationError } = await supabase
          .from('nations')
          .select('name')
          .eq('id', data.owner)
          .single();
        if (nationError) {
          console.error('Failed to fetch nation name:', { ...nationError });
        } else {
          owner_nation_name = nationData.name || 'None';
        }
      }

      setGameState((prevState) => {
        const newState = {
          ...prevState,
          dynamicTiles: {
            ...prevState.dynamicTiles,
            [tileId]: {
              ...prevState.dynamicTiles[tileId],
              owner: data.owner || null,
              building: data.building || null,
              owner_nation_name,
              nations: data.owner && prevState.nations[data.owner] ? prevState.nations[data.owner] : null,
              is_capital: data.is_capital || false,
            },
          },
        };
        console.log('setGameState called (updateSingleTile):', {
          changed: Object.keys(newState.dynamicTiles[tileId]).filter(
            (k) => newState.dynamicTiles[tileId][k] !== prevState.dynamicTiles[tileId]?.[k]
          ),
        });
        return newState;
      });

      if (selectedTile?.id === tileId) {
        setSelectedTile((prev) => ({
          ...prev,
          owner: data.owner || null,
          building: data.building || null,
          owner_nation_name,
          nations: data.owner && gameState.nations[data.owner] ? gameState.nations[data.owner] : null,
          is_capital: data.is_capital || false,
        }));
      }
    } catch (err) {
      console.error('Error in updateSingleTile:', { ...err });
      setError('Error updating tile: ' + err.message);
    }
  };

  // Wrapper for handleStartGame
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
      initializeGameState,
      findCapitalTile,
      supabase,
    });
  };

  useEffect(() => {
    console.log('App rendered, count:', (renderCount.current += 1));
  });

  // Initialize game state
  const initializeGameState = async () => {
    if (hasInitialized.current) {
      console.log('initializeGameState: Already initialized, skipping');
      return;
    }
    hasInitialized.current = true;
    console.log('initializeGameState: Starting');
    let finalNationData = null;

    try {
      setLoading(true);
      const gameStateRes = await supabase.rpc('fetch_game_state');

      if (gameStateRes.error) {
        console.error('Failed to fetch game state:', { ...gameStateRes.error });
        if (session) {
          setError(`Failed to load map data: ${gameStateRes.error.message}. Please try refreshing or disabling ad blockers.`);
        }
        setLoading(false);
        setIsInitialized(true);
        return;
      }

      if (!gameStateRes.data?.tiles || !gameStateRes.data?.nations) {
        console.warn('Incomplete game state data:', {
          tiles: !!gameStateRes.data?.tiles,
          nations: !!gameStateRes.data?.nations,
        });
        if (session) {
          setError('Incomplete map data received. Please try refreshing.');
        }
        setLoading(false);
        setIsInitialized(true);
        return;
      }

      if (session?.user?.id) {
        console.log('initializeGameState: Checking nation for user:', session.user.id);
        const { data: nationData, error: nationError } = await supabase
          .from('nations')
          .select('id, name, color, capital_tile_x, capital_tile_y, owner_id, lumber, oil, ore')
          .eq('owner_id', session.user.id)
          .maybeSingle();

        if (nationError) {
          console.error('Failed to fetch nation:', { ...nationError });
          setError('Failed to fetch nation: ' + nationError.message);
        } else if (nationData) {
          console.log('initializeGameState: Nation found:', { ...nationData });
          finalNationData = nationData;
        } else {
          console.log('initializeGameState: No nation found, showing modal');
          setShowNationModal(true);
        }

        if (finalNationData) {
          const { data: resourcesData, error: resourcesError } = await supabase
            .rpc('update_resources', { user_id: session.user.id });

          if (resourcesError) {
            console.error('Failed to update resources:', { ...resourcesError });
            setError('Failed to update resources: ' + resourcesError.message);
          } else if (resourcesData && resourcesData.length > 0) {
            console.log('initializeGameState: Resources updated:', { ...resourcesData[0] });
            finalNationData = resourcesData[0];
          }
        }
      }

      const staticTiles = {};
      const dynamicTiles = {};
      gameStateRes.data.tiles.forEach((tile) => {
        if (typeof tile.x !== 'number' || typeof tile.y !== 'number') {
          console.warn('Invalid tile data:', { ...tile });
          return;
        }
        const tileId = `${tile.x}_${tile.y}`;
        staticTiles[tileId] = {
          x: tile.x,
          y: tile.y,
          type: tile.type,
          resource: tile.resource || null,
        };
        dynamicTiles[tileId] = {
          owner: tile.owner || null,
          building: tile.building || null,
          owner_nation_name: tile.owner && gameStateRes.data.nations[tile.owner] ? gameStateRes.data.nations[tile.owner].name || 'None' : 'None',
          nations: tile.owner && gameStateRes.data.nations[tile.owner] ? gameStateRes.data.nations[tile.owner] : null,
          is_capital: tile.is_capital || false,
        };
      });

      staticTilesRef.current = staticTiles;
      const newState = {
        dynamicTiles,
        nations: gameStateRes.data.nations,
        userNation: finalNationData,
        resources: finalNationData
          ? { lumber: finalNationData.lumber || 0, oil: finalNationData.oil || 0, ore: finalNationData.ore || 0 }
          : { lumber: 0, oil: 0, ore: 0 },
        version: gameStateRes.data.version,
      };
      console.log('initializeGameState: Setting states', {
        userNation: newState.userNation,
        showNationModal: !finalNationData && !!session,
        tileCount: Object.keys(newState.dynamicTiles).length,
        nationCount: Object.keys(newState.nations).length,
      });
      setGameState(newState);
      lastNationRef.current = newState.userNation;
      lastResourcesRef.current = newState.resources;
      setShowNationModal(!finalNationData && !!session);
      setLoading(false);
      setIsInitialized(true);
    } catch (err) {
      console.error('Error in initializeGameState:', { ...err });
      if (session) {
        setError(`Error loading game data: ${err.message}. Please try refreshing or disabling ad blockers.`);
      }
      setLoading(false);
      setIsInitialized(true);
    }
  };

  // Session check and initial load
  useEffect(() => {
    async function checkSessionAndInitialize() {
      if (hasInitialized.current) {
        console.log('checkSessionAndInitialize: Already initialized, skipping');
        return;
      }
      try {
        setLoading(true);
        const { data } = await supabase.auth.getSession();
        console.log('checkSessionAndInitialize: Session retrieved:', { userId: data.session?.user?.id });
        setSession(data.session);
        await initializeGameState();
      } catch (err) {
        console.error('Error checking session:', { ...err });
        if (session) {
          setError(`Error initializing app: ${err.message}.`);
        }
        setLoading(false);
        setIsInitialized(true);
      }
    }

    checkSessionAndInitialize();
  }, []);

  // Resource tick
  useEffect(() => {
    if (!session?.user?.id || loading) {
      console.log('updateResources: Skipping due to no session or loading');
      return;
    }

    const updateResources = async () => {
      try {
        console.log('updateResources: Starting for user:', session.user.id);
        const { data: nationData, error: nationError } = await supabase
          .from('nations')
          .select('id, name, color, capital_tile_x, capital_tile_y, owner_id, lumber, oil, ore')
          .eq('owner_id', session.user.id)
          .maybeSingle();

        if (nationError) {
          console.error('Failed to fetch nation:', { ...nationError });
          setError('Failed to fetch nation: ' + nationError.message);
          setShowNationModal(true);
          return;
        }

        if (!nationData) {
          console.log('updateResources: No nation found, showing modal');
          setShowNationModal(true);
          return;
        }

        const { data, error } = await supabase
          .rpc('update_resources', { user_id: session.user.id });

        if (error) {
          console.error('Failed to update resources:', { ...error });
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

          if (resourcesUnchanged && nationUnchanged) {
            console.log('updateResources: No changes, skipping setGameState');
            return;
          }

          setGameState((prevState) => {
            const newState = {
              ...prevState,
              userNation: newNation,
              resources: newResources,
            };
            console.log('setGameState called (resources):', {
              changed: Object.keys(newState).filter(k => newState[k] !== prevState[k]),
            });
            lastNationRef.current = newNation;
            lastResourcesRef.current = newResources;
            return newState;
          });
          console.log('updateResources: Setting showNationModal to false');
          setShowNationModal(false);
        } else {
          console.log('updateResources: No nation data returned, showing modal');
          setShowNationModal(true);
        }
      } catch (err) {
        console.error('Error in updateResources:', { ...err });
        setError('Failed to update resources: ' + err.message);
      }
    };

    updateResources();
    if (gameState.userNation) {
      console.log('updateResources: Starting interval for user with nation');
      const interval = setInterval(updateResources, 3000);
      return () => {
        console.log('updateResources: Clearing interval');
        clearInterval(interval);
      };
    } else {
      console.log('updateResources: No nation, skipping interval');
    }
  }, [session?.user?.id, loading, gameState.userNation]);

  // Database subscription
  useEffect(() => {
    if (!session?.user?.id || loading) return;

    if (subscriptionRef.current) {
      console.log('Removing existing subscription');
      supabase.removeChannel(subscriptionRef.current);
    }

    let tileUpdates = [];
    const flushUpdates = debounce(() => {
      if (tileUpdates.length === 0) return;
      setGameState((prevState) => {
        if (!prevState) {
          console.warn('prevState is undefined in subscription');
          return prevState;
        }
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
        const newState = { ...prevState, dynamicTiles: newDynamicTiles };
        console.log('setGameState called (subscription):', {
          changedTiles: tileUpdates.map(u => u.key),
        });
        tileUpdates = [];
        return newState;
      });
    }, 500);

    const ownership_building_tile_update = supabase
      .channel('game_state_changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tiles' },
        async (payload) => {
          try {
            console.log('Tile update received:', { ...payload.new });
            const key = `${payload.new.x}_${payload.new.y}`;
            let owner_nation_name = 'None';
            if (payload.new.owner) {
              const { data: nationData, error: nationError } = await supabase
                .from('nations')
                .select('name')
                .eq('id', payload.new.owner)
                .single();
              if (nationError) {
                console.error('Failed to fetch nation name in subscription:', { ...nationError });
              } else {
                owner_nation_name = nationData.name || 'None';
              }
            }
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
                console.log('Subscription: No changes needed for selectedTile:', { x: payload.new.x, y: payload.new.y });
                return;
              }
              console.log('Subscription: Updating selectedTile:', { ...newTile });
              setSelectedTile(newTile);
            }
          } catch (err) {
            console.error('Error in tile subscription:', { ...err });
            setError('Error processing tile update: ' + err.message);
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    subscriptionRef.current = ownership_building_tile_update;

    return () => {
      console.log('Cleaning up subscription');
      supabase.removeChannel(ownership_building_tile_update);
      flushUpdates.clear();
    };
  }, [session?.user?.id, loading, gameState.nations]);

  // Auth state change listener with debouncing
  useEffect(() => {
    let timeoutId = null;
    const handleAuthChange = async (event, session) => {
      console.log('onAuthStateChange triggered:', { event, session });
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(async () => {
        setSession(session);
        console.log('Session set:', { userId: session?.user?.id });
        if (!session && !hasInitialized.current) {
          console.log('onAuthStateChange: No session, resetting user-specific state');
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
          await initializeGameState();
        } else if (session && !hasInitialized.current) {
          await initializeGameState();
        }
      }, 300);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      subscription.unsubscribe();
    };
  }, []);

  // Map centering
  useEffect(() => {
    if (loading || !mapScrollRef.current || Object.keys(gameState.dynamicTiles).length === 0) {
      return;
    }

    if (gameState?.userNation) {
      const { capital_tile_x, capital_tile_y } = gameState.userNation;
      const key = `${capital_tile_x}_${capital_tile_y}`;
      const capitalTile = gameState.dynamicTiles[key];

      if (!capitalTile || !staticTilesRef.current[key] || !capitalTile.is_capital) {
        console.warn('Capital tile not found or invalid:', {
          capitalTile,
          key,
          hasStaticTile: !!staticTilesRef.current[key],
          isCapital: capitalTile?.is_capital,
        });
        return;
      }

      const container = mapScrollRef.current;
      const capitalPixelX = capital_tile_x * TILE_SIZE;
      const capitalPixelY = capital_tile_y * TILE_SIZE;

      console.log('Centering map on capital tile:', { x: capital_tile_x, y: capital_tile_y });
      container.scrollTo({
        left: capitalPixelX - (container.clientWidth / 2) + (TILE_SIZE / 2),
        top: capitalPixelY - (container.clientHeight / 2) + (TILE_SIZE / 2),
        behavior: 'smooth',
      });

      const tileEl = document.querySelector(`.tile[data-x="${capital_tile_x}"][data-y="${capital_tile_y}"]`);
      if (tileEl) {
        tileEl.classList.add('capital-highlight');
      }

      // Re-center on user interaction after 4 seconds
      let timeoutId = null;
      const resetTimer = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
          console.log('Re-centering map on capital tile:', { x: capital_tile_x, y: capital_tile_y });
          container.scrollTo({
            left: capitalPixelX - (container.clientWidth / 2) + (TILE_SIZE / 2),
            top: capitalPixelY - (container.clientHeight / 2) + (TILE_SIZE / 2),
            behavior: 'smooth',
          });
        }, 4000);
      };

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
    } else {
      console.log('Centering map at default position for unauthenticated user');
      mapScrollRef.current.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
    }
  }, [gameState?.userNation, loading, gameState.dynamicTiles]);

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
      console.error('Error logging in:', { ...err });
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
      console.error('Error registering:', { ...err });
      setError('Failed to register: ' + err.message);
    }
  }

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
      setSession(null);
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
      hasInitialized.current = false;
      await initializeGameState();
    } catch (err) {
      console.error('Error logging out:', { ...err });
      setError('Failed to log out: ' + err.message);
    }
  }

  const getRoadShape = useCallback((tile) => {
    if (!tile.building || tile.building !== 'road') return null;

    const adjacentTiles = [
      { dx: 0, dy: -1, dir: 'top' },
      { dx: 0, dy: 1, dir: 'bottom' },
      { dx: 1, dy: 0, dir: 'right' },
      { dx: -1, dy: 0, dir: 'left' },
    ];

    const roadNeighbors = adjacentTiles.filter(({ dx, dy }) => {
      const adjKey = `${tile.x + dx}_${tile.y + dy}`;
      const adjTile = gameState.dynamicTiles[adjKey];
      return adjTile && adjTile.building === 'road';
    }).map(({ dir }) => dir);

    const count = roadNeighbors.length;
    console.log('getRoadShape:', { tileId: tile.id, roadNeighbors, count });

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
          startX = 16; startY = 0;
          controlY = 12;
          if (dir1 === 'right' || dir2 === 'right') {
            endX = 32; endY = 16; controlX = 20;
          } else {
            endX = 0; endY = 16; controlX = 12;
          }
        } else if (roadNeighbors.includes('bottom')) {
          startX = 16; startY = 32;
          controlY = 20;
          if (dir1 === 'right' || dir2 === 'right') {
            endX = 32; endY = 16; controlX = 20;
          } else {
            endX = 0; endY = 16; controlX = 12;
          }
        } else {
          startX = 0; startY = 16;
          controlX = 12;
          endX = 32; endY = 16; controlY = 20;
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
      const missingDir = ['top', 'bottom', 'left', 'right'].find(dir => !roadNeighbors.includes(dir));
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
  }, [gameState.dynamicTiles]);

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
          console.warn('Invalid tile in renderedTiles:', { ...tile });
          return null;
        }
        return tile;
      })
      .filter(tile => tile !== null)
      .sort((a, b) => a.y === b.y ? a.x - b.x : a.y - b.y);
  }, [gameState.dynamicTiles, loading]);

  // Log modal rendering conditions
  useEffect(() => {
    if (!loading && isInitialized) {
      console.log('Modal rendering check:', {
        showNationModal,
        userNationIsNull: gameState.userNation === null,
        userNation: gameState.userNation,
        tileCount: Object.keys(gameState.dynamicTiles).length,
      });
    }
  }, [loading, isInitialized, showNationModal, gameState.userNation, gameState.dynamicTiles]);

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

      {error && session && (
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

      {!loading && isInitialized && showNationModal && (
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
            <button className="button" disabled={gameState.userNation} onClick={handleStartGameWrapper}>
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
                className={`tile ${tile.type === 'plains' ? 'grass' : tile.type} ${
                  tile.is_capital && tile.owner === gameState?.userNation?.id ? 'capital-highlight' : ''
                } ${getTileBorderClasses(tile)} ${selectedTile?.id === tile.id ? 'selected-tile' : ''}`}
                data-x={tile.x}
                data-y={tile.y}
                title={`(${tile.x}, ${tile.y}) Type: ${tile.type}, Resource: ${
                  tile.resource || 'None'
                }, Owner: ${tile.owner_nation_name || 'None'}, Building: ${tile.building || 'None'}`}
                style={tile.owner && tile.nations && tile.nations.color ? { '--nation-color': tile.nations.color } : {}}
                onClick={() => debouncedSetSelectedTile(tile)}
              >
                {tile.is_capital && (
                  <div className="capital-building">
                    <div
                      className="capital-flag"
                      style={{
                        backgroundColor: tile?.nations?.color || '#ccc'
                      }}
                      title={tile.owner_nation_name || 'Unknown'}
                    />
                  </div>
                )}
                {tile.building === 'road' && (
                  <svg
                    width={TILE_SIZE}
                    height={TILE_SIZE}
                    viewBox={`0 0 ${TILE_SIZE} ${TILE_SIZE}`}
                    style={{ position: 'absolute', top: 0, left: 0 }}
                  >
                    {getRoadShape(tile)}
                  </svg>
                )}
                {tile.building === 'factory' && (
                  <span className="building-icon" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                    🏭
                  </span>
                )}
                {tile.building === 'mine' && (
                  <span className="building-icon" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                    ⛏️
                  </span>
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
              setSelectedTile={setSelectedTile}
              tiles={gameState?.dynamicTiles}
              updateSingleTile={updateSingleTile}
              supabase={supabase}
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
    </div>
  );
}

export default App;