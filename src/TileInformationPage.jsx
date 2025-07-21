function TileInformationPage() {
  return (
    <div className="tile-info-container">
      <div className="tile-info-table">
        <table>
          <tbody>
            <tr>
              <td className="tile-info-label">Tile</td>
              <td className="tile-info-value">X, Y</td>
            </tr>
            <tr>
              <td className="tile-info-label">Owner</td>
              <td className="tile-info-value">None</td>
            </tr>
            <tr>
              <td className="tile-info-label">Type</td>
              <td className="tile-info-value">Mountain</td>
            </tr>
            <tr>
              <td className="tile-info-label">Resource</td>
              <td className="tile-info-value">None</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="building-options">
        <div className="building-option" title="Build Road">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M4 12h16M12 4v16" />
          </svg>
          <span>Road</span>
        </div>
        <div className="building-option" title="Build Factory">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <rect x="2" y="6" width="20" height="12" />
            <path d="M6 6V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" />
            <path d="M8 10h.01M12 10h.01M16 10h.01" />
          </svg>
          <span>Factory</span>
        </div>
        <div className="building-option" title="Build Mine">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M12 2v6m-4-2l8 4m0-4l-8 4" />
            <rect x="2" y="8" width="20" height="14" />
          </svg>
          <span>Mine</span>
        </div>
      </div>
    </div>
  );
}

export default TileInformationPage;