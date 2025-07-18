import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import './index.css';

// Hardcoded Supabase credentials — **only safe if you use RLS on your tables!**
const supabaseUrl = 'https://kbiaueussvcshwlvaabu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiaWF1ZXVzc3Zjc2h3bHZhYWJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NTU1MDYsImV4cCI6MjA2ODMzMTUwNn0.MJ82vub25xntWjRaK1hS_37KwdDeckPQkZDF4bzZC3U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function App() {
  const [tiles, setTiles] = useState(null);
  const [error, setError] = useState(null);

  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // Load tiles data (replace with your real fetch later)
    const sampleTiles = [];
    for (let i = 0; i < 10000; i++) {
      sampleTiles.push({
        id: i,
        x: Math.floor(i / 100),
        y: i % 100,
        type: i % 3 === 0 ? 'grass' : i % 3 === 1 ? 'forest' : 'mountain',
        resource: null,
        owner: null,
      });
    }
    setTiles(sampleTiles);

    // Get current session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    // Listen to auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleRegister = async () => {
    setLoadingAuth(true);
    setAuthError(null);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setAuthError(error.message);
    else alert('Check your email for confirmation.');
    setLoadingAuth(false);
  };

  const handleLogin = async () => {
    setLoadingAuth(true);
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthError(error.message);
    setLoadingAuth(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setEmail('');
    setPassword('');
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-title">Empire’s Edge</div>

        {!session ? (
          <form
            className="login-form"
            onSubmit={e => e.preventDefault()}
          >
            <input
              type="email"
              placeholder="Email"
              className="input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loadingAuth}
            />
            <input
              type="password"
              placeholder="Password"
              className="input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loadingAuth}
            />
            <button
              type="button"
              className="button"
              onClick={handleLogin}
              disabled={loadingAuth}
            >
              LOGIN
            </button>
            <span className="divider">|</span>
            <button
              type="button"
              className="button"
              onClick={handleRegister}
              disabled={loadingAuth}
            >
              REGISTER
            </button>
          </form>
        ) : (
          <div className="user-info">
            <span className="username">{session.user.email}</span>
            <button className="button" onClick={handleLogout}>
              LOGOUT
            </button>
          </div>
        )}
      </header>

      {authError && <div className="error-box">{authError}</div>}
      {error && <div className="error-box">{error}</div>}

      {tiles && tiles.length > 0 && (
        <div className="map-scroll-container">
          <div className="map-grid">
            {tiles.map((tile) => (
              <div
                key={tile.id}
                className={`tile ${tile.type}`}
                title={`(${tile.x}, ${tile.y}) Type: ${tile.type}, Resource: ${
                  tile.resource || 'None'
                }, Owner: ${tile.owner || 'None'}`}
              />
            ))}
          </div>
        </div>
      )}

      {tiles === null && !error && (
        <div className="loading-message">Loading map data...</div>
      )}
    </div>
  );
}

export default App;
