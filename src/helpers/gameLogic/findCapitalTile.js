// helpers/gameLogic/findCapitalTile.js

/**
 * Finds a suitable tile for placing a new capital.
 * @param {Object} staticTiles - Object containing static tile data keyed by 'x_y'
 * @param {Object} dynamicTiles - Object containing dynamic tile data keyed by 'x_y'
 * @returns {Object|null} The selected tile object or null if none found
 */
export function findCapitalTile(staticTiles, dynamicTiles) {
  console.log('findCapitalTile: Starting search for capital tile', {
    staticTileCount: Object.keys(staticTiles).length,
    dynamicTileCount: Object.keys(dynamicTiles).length,
  });

  // Get all existing capital locations from dynamicTiles
  const existingCapitals = Object.values(dynamicTiles).filter(tile => tile.is_capital).map(tile => ({ x: tile.x, y: tile.y }));
  console.log('findCapitalTile: Found', existingCapitals.length, 'existing capital tiles');

  // Collect candidate tiles: unowned, not capital (tile type ignored)
  const candidates = Object.keys(staticTiles).map(key => {
    const staticTile = staticTiles[key];
    const dynamicTile = dynamicTiles[key] || { owner: null, is_capital: false };
    return { ...staticTile, owner: dynamicTile.owner, is_capital: dynamicTile.is_capital };
  }).filter(tile => 
    tile.owner === null &&
    !tile.is_capital
  );

  console.log('findCapitalTile: Found', candidates.length, 'candidate tiles', {
    sampleCandidates: candidates.slice(0, 5),
    landTiles: candidates.length,
    minDistance: 5,
    totalTiles: Object.keys(staticTiles).length,
  });

  if (candidates.length === 0) {
    return null;
  }

  // Filter candidates that are at least minDistance from all existing capitals
  const minDistance = 5;
  const validCandidates = candidates.filter(candidate => {
    return existingCapitals.every(capital => {
      const dist = Math.sqrt(Math.pow(candidate.x - capital.x, 2) + Math.pow(candidate.y - capital.y, 2));
      return dist >= minDistance;
    });
  });

  if (validCandidates.length === 0) {
    console.log('findCapitalTile: No valid tiles found after distance filter');
    return null;
  }

  // Select a random valid candidate
  const selected = validCandidates[Math.floor(Math.random() * validCandidates.length)];
  console.log('findCapitalTile: Selected tile', selected);

  return selected;
}