export function findCapitalTile(staticTilesRef, dynamicTiles) {
  console.log('findCapitalTile: Starting search for capital tile');

  if (!Object.keys(staticTilesRef).length) {
    console.error('findCapitalTile: No static tiles available');
    return null;
  }

  const capitalTiles = Object.values(dynamicTiles).filter(
    (tile) => tile.is_capital === true
  );
  console.log('findCapitalTile: Found', capitalTiles.length, 'existing capital tiles');

  const minDistance = 3;
  const candidates = Object.values(staticTilesRef).filter((tile) => {
    if (
      tile.x === undefined ||
      tile.y === undefined ||
      typeof tile.x !== 'number' ||
      typeof tile.y !== 'number' ||
      tile.type !== 'land'
    ) {
      console.warn('findCapitalTile: Skipping invalid tile', { tile });
      return false;
    }

    return capitalTiles.every((cap) => {
      const staticTile = staticTilesRef[`${cap.x}_${cap.y}`];
      if (!staticTile) {
        console.warn('findCapitalTile: Capital tile not found in staticTilesRef', { cap });
        return true;
      }
      const distance = Math.abs(tile.x - staticTile.x) + Math.abs(tile.y - staticTile.y);
      const isValidDistance = distance >= minDistance;
      if (!isValidDistance) {
        console.log('findCapitalTile: Tile too close to existing capital', {
          tile: { x: tile.x, y: tile.y },
          capital: { x: staticTile.x, y: staticTile.y },
          distance,
        });
      }
      return isValidDistance;
    });
  });

  console.log('findCapitalTile: Found', candidates.length, 'candidate tiles');
  if (candidates.length === 0) {
    console.error('findCapitalTile: No valid tiles found for capital placement');
    return null;
  }

  const idx = Math.floor(Math.random() * candidates.length);
  const selectedTile = candidates[idx];
  console.log('findCapitalTile: Selected tile', {
    x: selectedTile.x,
    y: selectedTile.y,
    type: selectedTile.type,
  });
  return selectedTile;
}