// helpers/gameLogic/updateResources.js

export const updateResourcesHelper = async ({
  supabase,
  session,
  setError,
  setShowNationModal,
  lastResourcesRef,
  lastNationRef,
  setGameState,
}) => {
  try {
    const { data: nationData, error: nationError } = await supabase
      .from('nations')
      .select('id, name, color, capital_tile_x, capital_tile_y, owner_id, lumber, oil, ore')
      .eq('owner_id', session.user.id)
      .maybeSingle();

    if (nationError) {
      setError('Failed to fetch nation: ' + nationError.message);
      setShowNationModal(true);
      return;
    }

    if (!nationData) {
      setShowNationModal(true);
      return;
    }

    const { data, error } = await supabase.rpc('update_resources', { user_id: session.user.id });

    if (error) {
      setError('Failed to update resources: ' + error.message);
      return;
    }

    if (data && data.length > 0) {
      const newNation = data[0];
      const newResources = {
        lumber: newNation.lumber || 0,
        oil: newNation.oil || 0,
        ore: newNation.ore || 0,
      };

      const resourcesUnchanged =
        lastResourcesRef.current.lumber === newResources.lumber &&
        lastResourcesRef.current.oil === newResources.oil &&
        lastResourcesRef.current.ore === newResources.ore;
      const nationUnchanged =
        lastNationRef.current &&
        lastNationRef.current.id === newNation.id &&
        lastNationRef.current.name === newNation.name &&
        lastNationRef.current.color === newNation.color &&
        lastNationRef.current.capital_tile_x === newNation.capital_tile_x &&
        lastNationRef.current.capital_tile_y === newNation.capital_tile_y &&
        lastNationRef.current.owner_id === newNation.owner_id &&
        lastNationRef.current.lumber === newNation.lumber &&
        lastNationRef.current.oil === newNation.oil &&
        lastNationRef.current.ore === newNation.ore;

      if (resourcesUnchanged && nationUnchanged) return;

      setGameState((prevState) => ({
        ...prevState,
        userNation: newNation,
        resources: newResources,
      }));
      lastNationRef.current = newNation;
      lastResourcesRef.current = newResources;
      setShowNationModal(false);
    } else {
      setShowNationModal(true);
    }
  } catch (err) {
    setError('Failed to update resources: ' + err.message);
  }
};