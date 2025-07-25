// helpers/gameLogic/getTileBorderClasses.js

export const getTileBorderClasses = (tile, dynamicTiles) => {
  if (!tile.owner || !tile.nations || !tile.nations.color) {
    return '';
  }

  const borders = [];
  const adjacentTiles = [
    { dx: 0, dy: -1, side: 'top' },
    { dx: 0, dy: 1, side: 'bottom' },
    { dx: 1, dy: 0, side: 'right' },
    { dx: -1, dy: 0, side: 'left' },
  ];

  adjacentTiles.forEach(({ dx, dy, side }) => {
    const adjKey = `${tile.x + dx}_${tile.y + dy}`;
    const adjacentTile = dynamicTiles[adjKey];
    if (!adjacentTile || adjacentTile.owner !== tile.owner) {
      borders.push(`border-${side}`);
    }
  });
  return borders.join(' ');
};