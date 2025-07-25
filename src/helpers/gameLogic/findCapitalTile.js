// helpers/gameLogic/findCapitalTile.js

/**
 * Finds a suitable tile for placing a new capital using server RPC.
 * @param {Object} supabase - Supabase client instance
 * @param {Object} staticTiles - Object containing static tile data keyed by 'x_y'
 * @returns {Object|null} The selected tile object or null if none found
 */
export async function findCapitalTile(supabase, staticTiles) {
  try {
    const { data, error } = await supabase.rpc('find_valid_capital_tile');

    if (error) {
      console.error('findCapitalTile: Failed to call RPC', { ...error });
      return null;
    }

    if (!data || data.length === 0) {
      console.log('findCapitalTile: No valid capital tile found from RPC');
      return null;
    }

    const { capital_x: x, capital_y: y } = data[0];
    const key = `${x}_${y}`;

    if (!staticTiles[key]) {
      console.error('findCapitalTile: Selected tile not found in staticTiles', { key });
      return null;
    }

    const selected = {
      ...staticTiles[key],
      owner: null,
      is_capital: false,
      building: null,
    };

    console.log('findCapitalTile: Selected tile from RPC', selected);

    return selected;
  } catch (err) {
    console.error('findCapitalTile: Error in RPC call', { ...err });
    return null;
  }
}