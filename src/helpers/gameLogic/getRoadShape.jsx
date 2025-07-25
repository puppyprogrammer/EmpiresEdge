// helpers/gameLogic/getRoadShape.js

import { useCallback } from 'react';

export const getRoadShape = (getBuildingName, dynamicTiles) => useCallback(
  (tile) => {
    const buildingName = getBuildingName(tile.building);
    if (!buildingName || buildingName !== 'road') return null;

    const adjacentTiles = [
      { dx: 0, dy: -1, dir: 'top' },
      { dx: 0, dy: 1, dir: 'bottom' },
      { dx: 1, dy: 0, dir: 'right' },
      { dx: -1, dy: 0, dir: 'left' },
    ];

    const roadNeighbors = adjacentTiles
      .filter(({ dx, dy }) => {
        const adjKey = `${tile.x + dx}_${tile.y + dy}`;
        const adjTile = dynamicTiles[adjKey];
        return adjTile && getBuildingName(adjTile.building) === 'road';
      })
      .map(({ dir }) => dir);

    const count = roadNeighbors.length;

    if (count === 0) {
      return <circle cx="16" cy="16" r="4" fill="#808080" />;
    } else if (count === 1) {
      const dir = roadNeighbors[0];
      if (dir === 'top') {
        return <line x1="16" y1="0" x2="16" y2="16" stroke="#808080" strokeWidth="4" />;
      } else if (dir === 'bottom') {
        return <line x1="16" y1="16" x2="16" y2="32" stroke="#808080" strokeWidth="4" />;
      } else if (dir === 'right') {
        return <line x1="16" y1="16" x2="32" y2="16" stroke="#808080" strokeWidth="4" />;
      } else {
        return <line x1="0" y1="16" x2="16" y2="16" stroke="#808080" strokeWidth="4" />;
      }
    } else if (count === 2) {
      if (roadNeighbors.includes('top') && roadNeighbors.includes('bottom')) {
        return <line x1="16" y1="0" x2="16" y2="32" stroke="#808080" strokeWidth="4" />;
      } else if (roadNeighbors.includes('left') && roadNeighbors.includes('right')) {
        return <line x1="0" y1="16" x2="32" y2="16" stroke="#808080" strokeWidth="4" />;
      } else {
        const [dir1, dir2] = roadNeighbors;
        let startX, startY, endX, endY, controlX, controlY;
        if (roadNeighbors.includes('top')) {
          startX = 16;
          startY = 0;
          controlY = 12;
          if (dir1 === 'right' || dir2 === 'right') {
            endX = 32;
            endY = 16;
            controlX = 20;
          } else {
            endX = 0;
            endY = 16;
            controlX = 12;
          }
        } else if (roadNeighbors.includes('bottom')) {
          startX = 16;
          startY = 32;
          controlY = 20;
          if (dir1 === 'right' || dir2 === 'right') {
            endX = 32;
            endY = 16;
            controlX = 20;
          } else {
            endX = 0;
            endY = 16;
            controlX = 12;
          }
        } else {
          startX = 0;
          startY = 16;
          controlX = 12;
          endX = 32;
          endY = 16;
          controlY = 20;
        }
        return (
          <path
            d={`M${startX},${startY} Q${controlX},${controlY} ${endX},${endY}`}
            stroke="#808080"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
        );
      }
    } else if (count === 3) {
      const missingDir = ['top', 'bottom', 'left', 'right'].find((dir) => !roadNeighbors.includes(dir));
      if (missingDir === 'top') {
        return (
          <>
            <line x1="16" y1="16" x2="16" y2="32" stroke="#808080" strokeWidth="4" />
            <line x1="0" y1="16" x2="32" y2="16" stroke="#808080" strokeWidth="4" />
          </>
        );
      } else if (missingDir === 'bottom') {
        return (
          <>
            <line x1="16" y1="0" x2="16" y2="16" stroke="#808080" strokeWidth="4" />
            <line x1="0" y1="16" x2="32" y2="16" stroke="#808080" strokeWidth="4" />
          </>
        );
      } else if (missingDir === 'right') {
        return (
          <>
            <line x1="0" y1="16" x2="16" y2="16" stroke="#808080" strokeWidth="4" />
            <line x1="16" y1="0" x2="16" y2="32" stroke="#808080" strokeWidth="4" />
          </>
        );
      } else {
        return (
          <>
            <line x1="16" y1="16" x2="32" y2="16" stroke="#808080" strokeWidth="4" />
            <line x1="16" y1="0" x2="16" y2="32" stroke="#808080" strokeWidth="4" />
          </>
        );
      }
    } else {
      return (
        <>
          <line x1="16" y1="0" x2="16" y2="32" stroke="#808080" strokeWidth="4" />
          <line x1="0" y1="16" x2="32" y2="16" stroke="#808080" strokeWidth="4" />
        </>
      );
    }
  },
  [dynamicTiles, getBuildingName]  // Note: Assuming gameState.dynamicTiles and gameState.buildingTypes are passed or in context; adjust as needed
);