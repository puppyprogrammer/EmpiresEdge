import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';

function TileInformationPage({ selectedTile, userNation, setError, setSelectedTile, tiles, updateSingleTile, supabase }) {
  const isOwnTile = useMemo(() => 
    selectedTile && userNation && selectedTile.owner === userNation.id && !selectedTile.is_capital,
    [selectedTile, userNation]
  );
  const isProcessing = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const renderCount = useRef(0);

  useEffect(() => {
    console.log('TileInformationPage rendered, count:', (renderCount.current += 1), 'selectedTile:', {
      id: selectedTile?.id,
      x: selectedTile?.x,
      y: selectedTile?.y,
      building: selectedTile?.building,
      isOwnTile,
    });
  }, [selectedTile, isOwnTile]);

  const updateLastTickTime = async () => {
    try {
      const { data: serverState } = await supabase
        .from('server_state')
        .select('id')
        .order('id', { ascending: false })
        .limit(1)
        .single();
      if (!serverState) {
        setError('Server state not found.');
        return;
      }
      const { error } = await supabase
        .from('server_state')
        .update({ last_tick_time: new Date().toISOString() })
        .eq('id', serverState.id);
      if (error) {
        setError('Failed to update server state: ' + error.message);
      }
    } catch (err) {
      setError('Error updating server state: ' + err.message);
    }
  };

  const debounceAction = (fn) => {
    return useCallback(() => {
      if (isProcessing.current) return;
      isProcessing.current = true;
      setIsLoading(true);
      fn().finally(() => {
        isProcessing.current = false;
        setIsLoading(false);
      });
    }, [fn]);
  };

  const handleBuildRoad = debounceAction(async () => {
    if (!selectedTile || typeof selectedTile.x !== 'number' || typeof selectedTile.y !== 'number') {
      setError('Invalid tile selected. Please select a valid tile.');
      console.error('Invalid selectedTile for road:', { ...selectedTile });
      return;
    }
    if (!userNation?.id) {
      setError('No nation selected. Please create a nation first.');
      return;
    }
    try {
      console.log('Optimistic update: Setting building to road for tile:', { x: selectedTile.x, y: selectedTile.y });
      setSelectedTile({ ...selectedTile, building: 'road' });
      console.log('Building road:', {
        tile_x: selectedTile.x,
        tile_y: selectedTile.y,
        user_nation_id: userNation.id,
        timestamp: new Date().toISOString(),
      });
      const { error } = await supabase
        .from('tiles')
        .update({ building: 'road' })
        .match({ x: selectedTile.x, y: selectedTile.y, owner: userNation.id, is_capital: false })
        .is('building', null);
      if (error) {
        console.log('Build road failed, reverting to null:', { x: selectedTile.x, y: selectedTile.y });
        setSelectedTile({ ...selectedTile, building: null });
        setError('Failed to build road: ' + error.message);
        console.error('Road build error:', { ...error });
        return;
      }
      console.log('Road built successfully:', {
        tile_x: selectedTile.x,
        tile_y: selectedTile.y,
        user_nation_id: userNation.id,
        timestamp: new Date().toISOString(),
      });
      await updateLastTickTime();
      // Subscription handles state update, no need for updateSingleTile
    } catch (err) {
      console.log('Build road error, reverting to null:', { x: selectedTile.x, y: selectedTile.y });
      setSelectedTile({ ...selectedTile, building: null });
      setError('Error building road: ' + err.message);
      console.error('Error building road:', { ...err });
    }
  });

  const handleBuildFactory = debounceAction(async () => {
    if (!selectedTile || typeof selectedTile.x !== 'number' || typeof selectedTile.y !== 'number') {
      setError('Invalid tile selected. Please select a valid tile.');
      console.error('Invalid selectedTile for factory:', { ...selectedTile });
      return;
    }
    if (!userNation?.id) {
      setError('No nation selected. Please create a nation first.');
      return;
    }
    try {
      console.log('Optimistic update: Setting building to factory for tile:', { x: selectedTile.x, y: selectedTile.y });
      setSelectedTile({ ...selectedTile, building: 'factory' });
      console.log('Building factory:', {
        tile_x: selectedTile.x,
        tile_y: selectedTile.y,
        user_nation_id: userNation.id,
        timestamp: new Date().toISOString(),
      });
      const { error } = await supabase
        .from('tiles')
        .update({ building: 'factory' })
        .match({ x: selectedTile.x, y: selectedTile.y, owner: userNation.id, is_capital: false })
        .is('building', null);
      if (error) {
        console.log('Build factory failed, reverting to null:', { x: selectedTile.x, y: selectedTile.y });
        setSelectedTile({ ...selectedTile, building: null });
        setError('Failed to build factory: ' + error.message);
        console.error('Factory build error:', { ...error });
        return;
      }
      console.log('Factory built successfully:', {
        tile_x: selectedTile.x,
        tile_y: selectedTile.y,
        user_nation_id: userNation.id,
        timestamp: new Date().toISOString(),
      });
      await updateLastTickTime();
      // Subscription handles state update, no need for updateSingleTile
    } catch (err) {
      console.log('Build factory error, reverting to null:', { x: selectedTile.x, y: selectedTile.y });
      setSelectedTile({ ...selectedTile, building: null });
      setError('Error building factory: ' + err.message);
      console.error('Error building factory:', { ...err });
    }
  });

  const handleBuildMine = debounceAction(async () => {
    if (!selectedTile || typeof selectedTile.x !== 'number' || typeof selectedTile.y !== 'number') {
      setError('Invalid tile selected. Please select a valid tile.');
      console.error('Invalid selectedTile for mine:', { ...selectedTile });
      return;
    }
    if (!userNation?.id) {
      setError('No nation selected. Please create a nation first.');
      return;
    }
    try {
      console.log('Optimistic update: Setting building to mine for tile:', { x: selectedTile.x, y: selectedTile.y });
      setSelectedTile({ ...selectedTile, building: 'mine' });
      console.log('Building mine:', {
        tile_x: selectedTile.x,
        tile_y: selectedTile.y,
        user_nation_id: userNation.id,
        timestamp: new Date().toISOString(),
      });
      const { error } = await supabase
        .from('tiles')
        .update({ building: 'mine' })
        .match({ x: selectedTile.x, y: selectedTile.y, owner: userNation.id, is_capital: false })
        .is('building', null);
      if (error) {
        console.log('Build mine failed, reverting to null:', { x: selectedTile.x, y: selectedTile.y });
        setSelectedTile({ ...selectedTile, building: null });
        setError('Failed to build mine: ' + error.message);
        console.error('Mine build error:', { ...error });
        return;
      }
      console.log('Mine built successfully:', {
        tile_x: selectedTile.x,
        tile_y: selectedTile.y,
        user_nation_id: userNation.id,
        timestamp: new Date().toISOString(),
      });
      await updateLastTickTime();
      // Subscription handles state update, no need for updateSingleTile
    } catch (err) {
      console.log('Build mine error, reverting to null:', { x: selectedTile.x, y: selectedTile.y });
      setSelectedTile({ ...selectedTile, building: null });
      setError('Error building mine: ' + err.message);
      console.error('Error building mine:', { ...err });
    }
  });

  const handleDeleteBuilding = debounceAction(async () => {
    if (!selectedTile || typeof selectedTile.x !== 'number' || typeof selectedTile.y !== 'number') {
      setError('Invalid tile selected. Please select a valid tile.');
      console.error('Invalid selectedTile for delete:', { ...selectedTile });
      return;
    }
    if (!userNation?.id) {
      setError('No nation selected. Please create a nation first.');
      return;
    }
    try {
      console.log('Optimistic update: Setting building to null for tile:', { x: selectedTile.x, y: selectedTile.y });
      const previousBuilding = selectedTile.building;
      setSelectedTile({ ...selectedTile, building: null });
      console.log('Deleting building:', {
        tile_x: selectedTile.x,
        tile_y: selectedTile.y,
        user_nation_id: userNation.id,
        building: previousBuilding,
        timestamp: new Date().toISOString(),
      });
      const { error } = await supabase
        .from('tiles')
        .update({ building: null })
        .match({ x: selectedTile.x, y: selectedTile.y, owner: userNation.id, is_capital: false });
      if (error) {
        console.log('Delete building failed, reverting to:', { x: selectedTile.x, y: selectedTile.y, building: previousBuilding });
        setSelectedTile({ ...selectedTile, building: previousBuilding });
        setError('Failed to delete building: ' + error.message);
        console.error('Delete building error:', { ...error });
        return;
      }
      console.log('Building deleted successfully:', {
        tile_x: selectedTile.x,
        tile_y: selectedTile.y,
        user_nation_id: userNation.id,
        building: previousBuilding,
        timestamp: new Date().toISOString(),
      });
      await updateLastTickTime();
      // Subscription handles state update, no need for updateSingleTile
    } catch (err) {
      console.log('Delete building error, reverting to:', { x: selectedTile.x, y: selectedTile.y, building: selectedTile.building });
      setSelectedTile({ ...selectedTile, building: selectedTile.building });
      setError('Error deleting building: ' + err.message);
      console.error('Error deleting building:', { ...err });
    }
  });

  return (
    <div className="tile-info-container">
      <div className="tile-info-table">
        <table>
          <tbody>
            <tr>
              <td className="tile-info-label">Tile</td>
              <td className="tile-info-value">
                {selectedTile && typeof selectedTile.x === 'number' && typeof selectedTile.y === 'number'
                  ? `${selectedTile.x}, ${selectedTile.y}`
                  : 'None'}
              </td>
            </tr>
            <tr>
              <td className="tile-info-label">Owner</td>
              <td className="tile-info-value">
                {selectedTile ? selectedTile.owner_nation_name || 'None' : 'None'}
              </td>
            </tr>
            <tr>
              <td className="tile-info-label">Type</td>
              <td className="tile-info-value">
                {selectedTile ? selectedTile.type : 'None'}
              </td>
            </tr>
            <tr>
              <td className="tile-info-label">Resource</td>
              <td className="tile-info-value">
                {selectedTile ? (selectedTile.resource || 'None') : 'None'}
              </td>
            </tr>
            <tr>
              <td className="tile-info-label">Building</td>
              <td className="tile-info-value">
                {selectedTile ? (
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    {selectedTile.building || 'None'}
                    {selectedTile.building === 'road' && <span style={{ marginLeft: '8px' }}>🛣️</span>}
                    {selectedTile.building === 'factory' && <span style={{ marginLeft: '8px' }}>🏭</span>}
                    {selectedTile.building === 'mine' && <span style={{ marginLeft: '8px' }}>⛏️</span>}
                  </span>
                ) : 'None'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {isOwnTile && !selectedTile.building && (
        <div className="building-options">
          <div
            className={`building-option ${isLoading ? 'disabled' : ''}`}
            title="Build Road"
            onClick={isLoading ? null : handleBuildRoad}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" strokeWidth="2">
              <path d="M4 12h16M12 4v16" />
            </svg>
            <span>Road</span>
            {isLoading && <span className="loading-spinner">...</span>}
          </div>
          <div
            className={`building-option ${isLoading ? 'disabled' : ''}`}
            title="Build Factory"
            onClick={isLoading ? null : handleBuildFactory}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" strokeWidth="2">
              <rect x="2" y="6" width="20" height="12" />
              <path d="M6 6V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" />
              <path d="M8 10h.01M12 10h.01M16 10h.01" />
            </svg>
            <span>Factory</span>
            {isLoading && <span className="loading-spinner">...</span>}
          </div>
          <div
            className={`building-option ${isLoading ? 'disabled' : ''}`}
            title="Build Mine"
            onClick={isLoading ? null : handleBuildMine}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" strokeWidth="2">
              <path d="M12 2v6m-4-2l8 4m0-4l-8 4" />
              <rect x="2" y="8" width="20" height="14" />
            </svg>
            <span>Mine</span>
            {isLoading && <span className="loading-spinner">...</span>}
          </div>
        </div>
      )}
      {isOwnTile && selectedTile.building && (
        <div className="building-options">
          <div
            className={`delete-building-option ${isLoading ? 'disabled' : ''}`}
            title="Delete Building"
            onClick={isLoading ? null : handleDeleteBuilding}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" strokeWidth="2">
              <path d="M3 6h18M6 6V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2M10 11v6M14 11v6M6 6l2 14h8l2-14" />
            </svg>
            <span>Delete</span>
            {isLoading && <span className="loading-spinner">...</span>}
          </div>
        </div>
      )}
      <style jsx>{`
        .building-option.disabled,
        .delete-building-option.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .loading-spinner {
          margin-left: 8px;
          font-size: 0.8em;
        }
      `}</style>
    </div>
  );
}

export default TileInformationPage;