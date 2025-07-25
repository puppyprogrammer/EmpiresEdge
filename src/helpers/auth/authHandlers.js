// helpers/auth/authHandlers.js

export async function handleLogin({
  e,
  supabase,
  loginEmail,
  loginPassword,
  setError,
  setLoginEmail,
  setLoginPassword,
  setShowMainMenu,
  setShowBottomMenu,
  setSelectedTile,
}) {
  e.preventDefault();
  setError(null);
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    if (error) {
      setError(error.message);
    } else {
      setLoginEmail('');
      setLoginPassword('');
      setShowMainMenu(false);
      setShowBottomMenu(false);
      setSelectedTile(null);
    }
  } catch (err) {
    setError('Failed to log in: ' + err.message);
  }
}

export async function handleRegister({
  e,
  supabase,
  registerEmail,
  registerPassword,
  registerUsername,
  setError,
  setRegisterEmail,
  setRegisterPassword,
  setRegisterUsername,
  setShowRegister,
  setShowMainMenu,
  setShowBottomMenu,
  setSelectedTile,
}) {
  e.preventDefault();
  setError(null);
  try {
    const { error } = await supabase.auth.signUp({
      email: registerEmail,
      password: registerPassword,
      options: { data: { username: registerUsername } },
    });
    if (error) {
      setError(error.message);
    } else {
      alert('Registration successful! Please check your email to confirm.');
      setRegisterEmail('');
      setRegisterPassword('');
      setRegisterUsername('');
      setShowRegister(false);
      setShowMainMenu(false);
      setShowBottomMenu(false);
      setSelectedTile(null);
    }
  } catch (err) {
    setError('Failed to register: ' + err.message);
  }
}

export async function handleLogout({
  supabase,
  setSession,
  setGameState,
  lastNationRef,
  lastResourcesRef,
  setShowNationModal,
  setShowMainMenu,
  setShowBottomMenu,
  setSelectedTile,
  setError,
  hasInitialized,
  handleInit,
}) {
  try {
    await supabase.auth.signOut();
    setSession(null);
    setGameState((prevState) => ({
      ...prevState,
      userNation: null,
      resources: { lumber: 0, oil: 0, ore: 0 },
    }));
    lastNationRef.current = null;
    lastResourcesRef.current = { lumber: 0, oil: 0, ore: 0 };
    setShowNationModal(false);
    setShowMainMenu(false);
    setShowBottomMenu(false);
    setSelectedTile(null);
    hasInitialized.current = false;
    handleInit();
  } catch (err) {
    setError('Failed to log out: ' + err.message);
  }
}