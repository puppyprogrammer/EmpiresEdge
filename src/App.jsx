import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import './index.css';

const supabaseUrl = 'https://kbiaueussvcshwlvaabu.supabase.co';
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiaWF1ZXVzc3Zjc2h3bHZhYWJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NTU1MDYsImV4cCI6MjA2ODMzMTUwNn0.MJ82vub25xntWjRaK1hS_37KwdDeckPQkZDF4bzZC3U';
const supabase = createClient(supabaseUrl, supabaseKey);

function App() {
  // Map state
  const [tiles, setTiles] = useState(null);
  const [error, setError] = useState(null);

  // Auth state
  const [session, setSession] = useState(null);

  // UI state for showing register form or login form
  const [showRegister, setShowRegister] = useState(false);

  // Login form inputs
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form inputs
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Load tiles (dummy sample for now)
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

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    if (error) setError(error.message);
    else {
      setLoginEmail('');
      setLoginPassword('');
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.auth.signUp({
      email: registerEmail,
      password: registerPassword,
      options: {
        data: {
          username: registerUsername,
        },
      },
    });
    if (error) setError(error.message);
    else {
      alert('Registration successful! Please check your email to confirm.');
      setRegisterEmail('');
      setRegisterPassword('');
      setRegisterUsername('');
      setShowRegister(false); // Switch back to login after register
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setSession(null);
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-title">Empire’s Edge</div>

        {!session && !showRegister && (
          <form className="login-form" onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Email"
              className="input"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              className="input"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              required
            />
            <button type="submit" className="button">
              LOGIN
            </button>
            <button
              type="button"
              className="button"
              onClick={() => {
                setShowRegister(true);
                setError(null);
              }}
              style={{ marginLeft: '0.5rem' }}
            >
              REGISTER
            </button>
          </form>
        )}

        {!session && showRegister && (
          <form className="login-form" onSubmit={handleRegister}>
            <input
              type="email"
              placeholder="Email"
              className="input"
              value={registerEmail}
              onChange={(e) => setRegisterEmail(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Username"
              className="input"
              value={registerUsername}
              onChange={(e) => setRegisterUsername(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              className="input"
              value={registerPassword}
              onChange={(e) => setRegisterPassword(e.target.value)}
              required
            />
            <button type="submit" className="button">
              REGISTER
            </button>
            <button
              type="button"
              className="button"
              onClick={() => {
                setShowRegister(false);
                setError(null);
              }}
              style={{ marginLeft: '0.5rem' }}
            >
              BACK TO LOGIN
            </button>
          </form>
        )}

        {session && (
          <div className="user-info">
            <span className="username">
              {session.user.user_metadata?.username || session.user.email}
            </span>
            <button className="button" onClick={handleLogout}>
              LOGOUT
            </button>
          </div>
        )}
      </header>

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
