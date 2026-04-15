import React, { createContext, useContext, useState, useCallback } from 'react';

/**
 * DMContext — allows any component anywhere in the app to programmatically
 * open the Direct Messaging panel with a specific user pre-loaded.
 *
 * Usage:
 *   const { openDM } = useDM();
 *   openDM({ _id, username, fullName, avatar });
 */
const DMContext = createContext(null);

export const DMProvider = ({ children }) => {
  // pendingUser: the user we want to open a DM with, or null
  const [pendingUser, setPendingUser] = useState(null);

  const openDM = useCallback((user) => {
    // user should have: _id, username, fullName (optional), avatar (optional)
    setPendingUser(user);
  }, []);

  const clearPendingUser = useCallback(() => {
    setPendingUser(null);
  }, []);

  return (
    <DMContext.Provider value={{ pendingUser, openDM, clearPendingUser }}>
      {children}
    </DMContext.Provider>
  );
};

export const useDM = () => {
  const ctx = useContext(DMContext);
  if (!ctx) throw new Error('useDM must be used within a DMProvider');
  return ctx;
};
