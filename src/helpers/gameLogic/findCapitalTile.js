export function findCapitalTile(staticTilesRef, dynamicTiles) {
  console.log('findCapitalTile: Starting search for capital tile', {
    staticTileCount: Object.keys(staticTilesRef).length,
    dynamicTileCount: Object.keys(dynamicTiles).length,
  });

  if (!Object.keys(staticTilesRef).length) {
    console.error('findCapitalTile: No static tiles available');
    return null;
  }

  const capitalTiles = Object.values(dynamicTiles).filter(
    (tile) => tile.is_capital === true
  );
  console.log('findCapitalTile: Found', capitalTiles.length, 'existing capital tiles');

  const minDistance = 5;
  const validTypes = ['land', 'forest', 'grass'];

  const candidates = Object.values(staticTilesRef).filter((tile) => {
    if (
      typeof tile.x !== 'number' ||
      typeof tile.y !== 'number'
    ) {
      console.warn('findCapitalTile: Skipping tile due to invalid coordinates', {
        tile: { x: tile.x, y: tile.y, type: tile.type },
      });
      return false;
    }

    if (!validTypes.includes(tile.type)) {
      return false;
    }

    // Check distance from all existing capitals
    const isValidDistance = capitalTiles.every((cap) => {
      if (typeof cap.x !== 'number' || typeof cap.y !== 'number') return true;

      const distance = Math.abs(tile.x - cap.x) + Math.abs(tile.y - cap.y);
      const isValid = distance >= minDistance;

      if (!isValid) {
        console.log('findCapitalTile: Tile too close to existing capital', {
          tile: { x: tile.x, y: tile.y },
          capital: { x: cap.x, y: cap.y },
          distance,
        });
      }
      return isValid;
    });

    return isValidDistance;
  });

  console.log('findCapitalTile: Found', candidates.length, 'candidate tiles', {
    sampleCandidates: candidates.slice(0, 5).map(t => ({ x: t.x, y: t.y, type: t.type })),
  });

  if (candidates.length === 0) {
    console.error('findCapitalTile: No valid tiles found for capital placement', {
      validTypes,
      minDistance,
      totalTiles: Object.keys(staticTilesRef).length,
      landTiles: Object.values(staticTilesRef).filter(t => validTypes.includes(t.type)).length,
    });
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
