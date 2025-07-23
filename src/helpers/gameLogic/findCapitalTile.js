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

  const minDistance = 2; // Reduced from 3 to allow more candidates
  const validTypes = ['land', 'forest', 'grass']; // Include more types
  const candidates = Object.values(staticTilesRef).filter((tile) => {
    // Validate tile properties
    if (
      tile.x === undefined ||
      tile.y === undefined ||
      typeof tile.x !== 'number' ||
      typeof tile.y !== 'number'
    ) {
      console.warn('findCapitalTile: Skipping tile due to invalid coordinates', {
        tile: { x: tile.x, y: tile.y, type: tile.type },
      });
      return false;
    }

    if (!validTypes.includes(tile.type)) {
      console.warn('findCapitalTile: Skipping tile due to invalid type', {
        tile: { x: tile.x, y: tile.y, type: tile.type },
      });
      return false;
    }

    // Check distance from existing capitals
    const isValidDistance = capitalTiles.every((cap) => {
      const staticTile = staticTilesRef[`${cap.x}_${cap.y}`];
      if (!staticTile) {
        console.warn('findCapitalTile: Capital tile not found in staticTilesRef', {
          cap: { x: cap.x, y: cap.y },
        });
        return true; // Allow tile if capital data is missing
      }
      const distance = Math.abs(tile.x - staticTile.x) + Math.abs(tile.y - staticTile.y);
      const isValid = distance >= minDistance;
      if (!isValid) {
        console.log('findCapitalTile: Tile too close to existing capital', {
          tile: { x: tile.x, y: tile.y },
          capital: { x: staticTile.x, y: staticTile.y },
          distance,
        });
      }
      return isValid;
    });

    if (!isValidDistance) {
      return false;
    }

    // Ensure tile is unowned
    const dynamicTile = dynamicTiles[`${tile.x}_${tile.y}`];
    if (dynamicTile && dynamicTile.owner) {
      console.warn('findCapitalTile: Skipping tile due to existing owner', {
        tile: { x: tile.x, y: tile.y, owner: dynamicTile.owner },
      });
      return false;
    }

    return true;
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
      unownedTiles: Object.values(staticTilesRef).filter(t => !dynamicTiles[`${t.x}_${t.y}`]?.owner).length,
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