// helpers/gameLogic/initializeGameState.js

/**
 * Initializes the game state from Supabase and updates React state.
 *
 * @param {Object} params
 * @param {Object} params.supabase - Supabase client
 * @param {Object} params.staticTilesRef - Ref object for static tiles
 * @param {Function} params.setGameState - Setter for React gameState
 * @param {Function} params.setLoading - Setter for loading state
 * @param {Function} params.setIsInitialized - Setter for initialized state
 * @param {Function} params.setError - Setter for error message
 * @param {Function} params.setShowNationModal - Setter for nation modal
 * @param {Object} params.lastNationRef - Ref for last userNation
 * @param {Object} params.lastResourcesRef - Ref for last resources
 * @param {Object} params.session - Current session object
 * @param {boolean} params.hasInitialized - Ref for already initialized
 */
const initializeGameState = async ({
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
  hasInitialized
}) => {
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
        owner_nation_name: tile.owner_nation_name || 'None',
        nations: tile.nations || null,
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
      tileTypes: gameStateRes.data.tileTypes,
      resourceTypes: gameStateRes.data.resources,
      buildingTypes: gameStateRes.data.buildings,
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

export default initializeGameState;
