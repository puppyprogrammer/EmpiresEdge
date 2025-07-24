import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import './index.css';
import initializeGameState from './helpers/gameLogic/initializeGameState';
import renderAppUI from './helpers/gameLogic/renderAppUI.jsx';
import { handleStartGame } from './helpers/gameLogic/handleStartGame.js';
import { findCapitalTile } from './helpers/gameLogic/findCapitalTile.js';

// ---- SUPABASE ----
const supabaseUrl = 'https://kbiaueussvcshwlvaabu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiaWF1ZXVzc3Zjc2h3bHZhYWJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NTU1MDYsImV4cCI6MjA2ODMzMTUwNn0.MJ82vub25xntWjRaK1hS_37KwdDeckPQkZDF4bzZC3U';
const supabase = createClient(supabaseUrl, supabaseKey);

function App() {
  // --- REFS & CONSTANTS ---
  const mapScrollRef = useRef(null);
  const staticTilesRef = useRef({});
  const subscriptionRef = useRef(null);
  const lastNationRef = useRef(null);
  const lastResourcesRef = useRef({ lumber: 0, oil: 0, ore: 0 });
  const hasInitialized = useRef(false);
  const TILE_SIZE = 32;

  // --- STATE ---
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

  // --- MEMOIZED HELPERS ---
  const nationsMemo = useMemo(() => JSON.parse(JSON.stringify(gameState.nations)), [gameState.nations]);

  // --- DEBOUNCE HELPERS ---
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

  // --- START GAME WRAPPER ---
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

  // --- INITIALIZE GAME STATE ---
  // Now calls the helper, which you must import (as you already do)
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

  // --- SESSION INIT ---
  useEffect(() => {
    (async () => {
      if (hasInitialized.current) return;
      setLoading(true);
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      handleInit();
    })();
    // eslint-disable-next-line
  }, []);

  // --- RESOURCE REFRESH INTERVAL ---
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

  // --- SUBSCRIPTION ---
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

  // --- AUTH CHANGE ---
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
          handleInit();
        } else if (session && !hasInitialized.current) {
          handleInit();
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

  // --- MAP CENTERING ---
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

  // --- LOGIN/REGISTER/LOGOUT HANDLERS ---
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
      handleInit();
    } catch (err) {
      console.error('Error logging out:', { ...err });
      setError('Failed to log out: ' + err.message);
    }
  }

  // --- FORMATTERS ---
  const formatNumber = (num) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  // --- RENDERED TILES MEMO ---
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
      .filter(tile => tile !== null)
      .sort((a, b) => a.y === b.y ? a.x - b.x : a.y - b.y);
  }, [gameState.dynamicTiles, loading]);

  // --- UI RENDER (ALL PRESENTATION MOVED TO RENDER HELPER) ---
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
    handleLogin,
    loginEmail,
    setLoginEmail,
    loginPassword,
    setLoginPassword,
    handleRegister,
    registerEmail,
    setRegisterEmail,
    registerUsername,
    setRegisterUsername,
    registerPassword,
    setRegisterPassword,
    setShowRegister,
    setError,
    handleLogout,
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
    // Pass more handlers as needed!
  });
}

export default App;