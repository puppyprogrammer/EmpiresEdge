// helpers/gameLogic/updateSingleTile.jsx

/**
 * Update a single tile in Supabase and merge it into local gameState.
 * 
 * @param {Object} params
 * @param {string} params.tileId Tile key in format "x_y"
 * @param {Object} params.updates Object of columns to update
 * @param {Object} params.supabase Supabase client instance
 * @param {Object} params.staticTilesRef Ref to static tile index { [tileId]: { x, y } }
 * @param {Object} params.gameState Latest game state (for nations lookup)
 * @param {Function} params.setGameState React setState for gameState
 * @param {Object} params.selectedTile The currently selected tile
 * @param {Function} params.setSelectedTile React setState for selectedTile
 * @param {Function} params.setError React setState for error
 */
const updateSingleTile = async ({
  tileId,
  updates,
  supabase,
  staticTilesRef,
  gameState,
  setGameState,
  selectedTile,
  setSelectedTile,
  setError,
}) => {
  try {
    console.log('updateSingleTile called:', { tileId, updates, staticTileCount: Object.keys(staticTilesRef.current).length });
    if (!tileId || !tileId.includes('_')) {
      console.error('Invalid tileId format in updateSingleTile:', { tileId, expected: 'x_y', availableKeys: Object.keys(staticTilesRef.current).slice(0, 5) });
      setError('Invalid tile ID format');
      return;
    }
    const { x, y } = staticTilesRef.current[tileId] || {};
    if (typeof x !== 'number' || typeof y !== 'number') {
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

    if (!data) {
      console.warn('No data returned from tile update:', { tileId, updates });
      setError('Tile update succeeded but no data returned');
      return;
    }

    // Update local state
    const owner_nation_name = data.owner ? gameState.nations[data.owner]?.name || 'None' : 'None';
    const nations = data.owner ? gameState.nations[data.owner] : null;

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
            nations,
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
        nations,
        is_capital: data.is_capital || false,
      }));
    }
  } catch (err) {
    console.error('Error in updateSingleTile:', { ...err });
    setError('Error updating tile: ' + err.message);
  }
};

export default updateSingleTile;