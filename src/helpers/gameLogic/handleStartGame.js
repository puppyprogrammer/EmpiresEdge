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

  if (!Object.keys(staticTilesRef.current).length) {
    console.error('handleStartGame: Map data not loaded');
    setError('Map data not loaded. Please try again.');
    return;
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

    console.log('handleStartGame: Starting capital tile selection');
    const capitalTile = findCapitalTile(staticTilesRef.current, gameState.dynamicTiles);
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

    console.log('handleStartGame: Nation created:', { ...nationData });
    console.log('handleStartGame: Hiding nation modal after creation');
    setShowNationModal(false);
    setNationName('');
    await initializeGameState();
  } catch (err) {
    console.error('handleStartGame: Error creating nation:', { ...err });
    setError('Error creating nation: ' + err.message);
  }
}