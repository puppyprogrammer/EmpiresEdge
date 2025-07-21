import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kbiaueussvcshwlvaabu.supabase.co';
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiaWF1ZXVzc3Zjc2h3bHZhYWJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NTU1MDYsImV4cCI6MjA2ODMzMTUwNn0.MJ82vub25xntWjRaK1hS_37KwdDeckPQkZDF4bzZC3U';
const supabase = createClient(supabaseUrl, supabaseKey);

function TileInformationPage({ selectedTile, userNation, setError, fetchTiles, setSelectedTile, tiles }) {
  const isOwnTile = selectedTile && userNation && selectedTile.owner === userNation.id && !selectedTile.is_capital;

  console.log('TileInformationPage render - selectedTile:', {
    id: selectedTile?.id,
    x: selectedTile?.x,
    y: selectedTile?.y,
    building: selectedTile?.building,
    isOwnTile
  });

  const updateSelectedTile = () => {
    if (!selectedTile || !tiles) return;
    const updatedTile = tiles.find(t => t.id === selectedTile.id);
    if (updatedTile) {
      setSelectedTile(updatedTile);
    }
  };

  const handleBuildRoad = async () => {
    if (!selectedTile) return;

    try {
      const { error } = await supabase
        .from('tiles')
        .update({ building: 'road' })
        .eq('id', selectedTile.id);

      if (error) {
        setError('Failed to build road: ' + error.message);
        return;
      }

      await fetchTiles();
      updateSelectedTile();
    } catch (err) {
      setError('Error building road: ' + err.message);
    }
  };

  const handleBuildFactory = async () => {
    if (!selectedTile) return;

    try {
      const { error } = await supabase
        .from('tiles')
        .update({ building: 'factory' })
        .eq('id', selectedTile.id);

      if (error) {
        setError('Failed to build factory: ' + error.message);
        return;
      }

      await fetchTiles();
      updateSelectedTile();
    } catch (err) {
      setError('Error building factory: ' + err.message);
    }
  };

  const handleBuildMine = async () => {
    if (!selectedTile) return;

    try {
      const { error } = await supabase
        .from('tiles')
        .update({ building: 'mine' })
        .eq('id', selectedTile.id);

      if (error) {
        setError('Failed to build mine: ' + error.message);
        return;
      }

      await fetchTiles();
      updateSelectedTile();
    } catch (err) {
      setError('Error building mine: ' + err.message);
    }
  };

  const handleDeleteBuilding = async () => {
    if (!selectedTile) return;

    try {
      const { error } = await supabase
        .from('tiles')
        .update({ building: null })
        .eq('id', selectedTile.id);

      if (error) {
        setError('Failed to delete building: ' + error.message);
        return;
      }

      await fetchTiles();
      updateSelectedTile();
    } catch (err) {
      setError('Error deleting building: ' + err.message);
    }
  };

  return (
    <div className="tile-info-container">
      <div className="tile-info-table">
        <table>
          <tbody>
            <tr>
              <td className="tile-info-label">Tile</td>
              <td className="tile-info-value">
                {selectedTile ? `${selectedTile.x}, ${selectedTile.y}` : 'None'}
              </td>
            </tr>
            <tr>
              <td className="tile-info-label">Owner</td>
              <td className="tile-info-value">
                {selectedTile ? selectedTile.owner_nation_name : 'None'}
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
          </tbody>
        </table>
      </div>
      {isOwnTile && !selectedTile.building && (
        <div className="building-options">
          <div className="building-option" title="Build Road" onClick={handleBuildRoad}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" strokeWidth="2">
              <path d="M4 12h16M12 4v16" />
            </svg>
            <span>Road</span>
          </div>
          <div className="building-option" title="Build Factory" onClick={handleBuildFactory}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" strokeWidth="2">
              <rect x="2" y="6" width="20" height="12" />
              <path d="M6 6V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" />
              <path d="M8 10h.01M12 10h.01M16 10h.01" />
            </svg>
            <span>Factory</span>
          </div>
          <div className="building-option" title="Build Mine" onClick={handleBuildMine}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" strokeWidth="2">
              <path d="M12 2v6m-4-2l8 4m0-4l-8 4" />
              <rect x="2" y="8" width="20" height="14" />
            </svg>
            <span>Mine</span>
          </div>
        </div>
      )}
      {isOwnTile && selectedTile.building && (
        <div className="building-options">
          <div className="delete-building-option" title="Delete Building" onClick={handleDeleteBuilding}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" strokeWidth="2">
              <path d="M3 6h18M6 6V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2M10 11v6M14 11v6M6 6l2 14h8l2-14" />
            </svg>
            <span>Delete</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default TileInformationPage;