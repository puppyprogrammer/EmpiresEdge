/**
 * Handles the creation of a new nation or skips if the user already has one.
 * @param {Object} params - Parameters for the function
 * @param {Object} params.session - Supabase session object
 * @param {string} params.nationName - Name of the new nation
 * @param {string} params.nationColor - Color for the new nation
 * @param {Object} params.staticTilesRef - Reference to static tiles
 * @param {Object} params.gameState - Current game state
 * @param {Function} params.setShowNationModal - Function to toggle nation modal visibility
 * @param {Function} params.setNationName - Function to set nation name
 * @param {Function} params.setError - Function to set error message
 * @param {Function} params.initializeGameState - Function to initialize game state
 * @param {Function} params.findCapitalTile - Function to find a valid capital tile
 * @param {Object} params.supabase - Supabase client instance
 * @param {Object} params.hasInitialized - Ref to track initialization (passed from App.jsx)
 */
export async function handleStartGame({
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
  hasInitialized,  // Add this to params
}) {
  if (!session?.user?.id) {
    console.error('handleStartGame: No user session available');
    setError('No user session available. Please log in again.');
    return;
  }

  // Check if user already has a nation
  console.log('handleStartGame: Checking for existing nation for user:', session.user.id);
  const { data: existingUserNation, error: nationCheckError } = await supabase
    .from('nations')
    .select('id, name, capital_tile_x, capital_tile_y')
    .eq('owner_id', session.user.id)
    .maybeSingle();

  if (nationCheckError) {
    console.error('handleStartGame: Failed to check existing nation:', { ...nationCheckError });
    setError('Failed to check existing nation: ' + nationCheckError.message);
    return;
  }

  if (existingUserNation) {
    console.log('handleStartGame: User already has a nation:', {
      id: existingUserNation.id,
      name: existingUserNation.name,
      capital: { x: existingUserNation.capital_tile_x, y: existingUserNation.capital_tile_y },
    });
    setShowNationModal(false);
    setNationName('');
    await initializeGameState();
    return;
  }

  const trimmedName = nationName.trim();
  if (!trimmedName) {
    console.error('handleStartGame: Nation name is empty');
    setError('Nation name is required');
    return;
  }

  // Validate nation name
  if (trimmedName.length > 10) {
    console.error('handleStartGame: Nation name too long:', trimmedName);
    setError('Nation name must be 10 characters or less');
    return;
  }
  if (!/^[a-zA-Z0-9\s]+$/.test(trimmedName)) {
    console.error('handleStartGame: Invalid characters in nation name:', trimmedName);
    setError('Nation name must contain only letters, numbers, and spaces');
    return;
  }

  // Load static tiles if not already loaded
  if (!Object.keys(staticTilesRef.current).length) {
    console.log('handleStartGame: Loading static map data');
    try {
      // Load tile_types first to map IDs to names
      const { data: tileTypesData, error: tileTypesError } = await supabase
        .from('tile_types')
        .select('id, name');

      if (tileTypesError) {
        console.error('handleStartGame: Failed to load tile types:', { ...tileTypesError });
        setError('Failed to load tile types: ' + tileTypesError.message);
        return;
      }

      const tileTypesMap = tileTypesData.reduce((acc, tt) => {
        acc[tt.id] = tt.name;
        return acc;
      }, {});

      // Load tiles
      const { data: staticData, error: staticError } = await supabase
        .from('tiles')
        .select('x, y, type, resource');  // Select only static columns

      if (staticError) {
        console.error('handleStartGame: Failed to load static tiles:', { ...staticError });
        setError('Failed to load map data: ' + staticError.message);
        return;
      }

      if (!staticData || staticData.length === 0) {
        console.error('handleStartGame: No static tiles data returned');
        setError('No map data available. Please try again later.');
        return;
      }

      // Populate the ref with tiles keyed by 'x_y', mapping type ID to name
      staticTilesRef.current = staticData.reduce((acc, tile) => {
        const key = `${tile.x}_${tile.y}`;
        acc[key] = {
          x: tile.x,
          y: tile.y,
          type: tileTypesMap[tile.type] || 'unknown',  // Use string name instead of ID
          resource: tile.resource || null,
        };
        return acc;
      }, {});

      console.log('handleStartGame: Static tiles loaded successfully', Object.keys(staticTilesRef.current).length);
    } catch (err) {
      console.error('handleStartGame: Error loading static tiles:', { ...err });
      setError('Error loading map data: ' + err.message);
      return;
    }
  } else {
    console.log('handleStartGame: Static tiles already loaded');
  }

  try {
    console.log('handleStartGame: Checking nation name availability:', trimmedName);
    const { data: existingNation, error: nameCheckError } = await supabase
      .from('nations')
      .select('id')
      .eq('name', trimmedName)
      .maybeSingle();

    if (nameCheckError) {
      console.error('handleStartGame: Failed to check nation name:', { ...nameCheckError });
      setError('Failed to check nation name: ' + nameCheckError.message);
      return;
    }

    if (existingNation) {
      console.error('handleStartGame: Nation name already taken:', trimmedName);
      setError('Nation name "' + trimmedName + '" is already taken. Please choose another.');
      return;
    }

    // Load dynamic tiles locally if not already in gameState
    let localDynamicTiles = gameState.dynamicTiles;
    if (!Object.keys(localDynamicTiles).length) {
      console.log('handleStartGame: Loading dynamic tile data for capital selection');
      const { data: dynamicData, error: dynamicError } = await supabase
        .from('tiles')
        .select('x, y, owner, is_capital, building');

      if (dynamicError) {
        console.error('handleStartGame: Failed to load dynamic tiles:', { ...dynamicError });
        setError('Failed to load dynamic map data: ' + dynamicError.message);
        return;
      }

      localDynamicTiles = dynamicData.reduce((acc, tile) => {
        const key = `${tile.x}_${tile.y}`;
        acc[key] = {
          owner: tile.owner || null,
          is_capital: tile.is_capital || false,
          building: tile.building || null,
          // Add owner_nation_name or other derived fields if needed by findCapitalTile
        };
        return acc;
      }, {});

      console.log('handleStartGame: Dynamic tiles loaded successfully', Object.keys(localDynamicTiles).length);
    }

    console.log('handleStartGame: Starting capital tile selection');
    const capitalTile = findCapitalTile(staticTilesRef.current, localDynamicTiles);
    if (!capitalTile) {
      console.error('handleStartGame: No capital tile found');
      setError('No available tile to place capital.');
      return;
    }
    console.log('handleStartGame: Capital tile selected:', {
      x: capitalTile.x,
      y: capitalTile.y,
      type: capitalTile.type,
    });

    console.log('handleStartGame: Creating nation with name:', trimmedName, 'color:', nationColor);
    const { data: nationData, error: insertError } = await supabase
      .rpc('create_nation', {
        user_id: session.user.id,
        nation_name: trimmedName,
        nation_color: nationColor,
        capital_x: capitalTile.x,
        capital_y: capitalTile.y,
      })
      .single();

    if (insertError) {
      console.error('handleStartGame: Failed to create nation:', { ...insertError });
      setError('Failed to create nation: ' + insertError.message);
      return;
    }

    // Claim the 8 surrounding tiles
    const newNationId = nationData.id;
    const offsets = [
      { dx: -1, dy: -1 },
      { dx: -1, dy: 0 },
      { dx: -1, dy: 1 },
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: 1, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 1, dy: 1 },
    ];

    for (const { dx, dy } of offsets) {
      const adjX = capitalTile.x + dx;
      const adjY = capitalTile.y + dy;
      const adjKey = `${adjX}_${adjY}`;

      // Check if the tile exists and is unowned (null or 0)
      if (staticTilesRef.current[adjKey] && (!localDynamicTiles[adjKey] || localDynamicTiles[adjKey].owner == null || localDynamicTiles[adjKey].owner === 0)) {
        const { error: adjError } = await supabase
          .from('tiles')
          .update({ owner: newNationId })
          .eq('x', adjX)
          .eq('y', adjY);

        if (adjError) {
          console.error('handleStartGame: Failed to claim adjacent tile:', adjKey, { ...adjError });
          // Optionally handle error, but continue to allow nation creation
        } else {
          console.log('handleStartGame: Claimed adjacent tile:', adjKey);
        }
      } else {
        console.log('handleStartGame: Adjacent tile not claimable:', adjKey, { exists: !!staticTilesRef.current[adjKey], owner: localDynamicTiles[adjKey]?.owner });
      }
    }

    console.log('handleStartGame: Nation created:', { ...nationData });
    console.log('handleStartGame: Hiding nation modal after creation');
    setShowNationModal(false);
    setNationName('');

    // Force re-initialization to load new data
    hasInitialized.current = false;
    await initializeGameState();
  } catch (err) {
    console.error('handleStartGame: Error creating nation:', { ...err });
    setError('Error creating nation: ' + err.message);
  }
}