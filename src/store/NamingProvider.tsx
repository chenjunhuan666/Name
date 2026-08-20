import { useEffect, useReducer } from 'react';
import type { PropsWithChildren } from 'react';
import {
  loadNamingData,
  saveNamingData,
} from '../core/storage/namingPersistence';
import { NamingContext } from './namingContext';
import {
  initialNamingState,
  namingReducer,
  type NamingState,
} from './namingStore';

function initializeNamingState(baseState: NamingState): NamingState {
  const persisted = loadNamingData();
  const latest = persisted.namingHistory[0];

  return {
    ...baseState,
    ...(latest
      ? {
          inputMode: latest.inputMode,
          surname: latest.surname,
          gender: latest.gender,
          birthInfo: latest.birthInfo,
          calendarResult: latest.calendarResult,
          bazi: latest.bazi,
          analysis: latest.analysis,
        }
      : {}),
    favorites: persisted.favorites,
    namingHistory: persisted.namingHistory,
    recentViews: persisted.recentViews,
  };
}

export function NamingProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(
    namingReducer,
    initialNamingState,
    initializeNamingState,
  );

  useEffect(() => {
    saveNamingData({
      favorites: state.favorites,
      namingHistory: state.namingHistory,
      recentViews: state.recentViews,
    });
  }, [state.favorites, state.namingHistory, state.recentViews]);

  return (
    <NamingContext.Provider value={{ state, dispatch }}>
      {children}
    </NamingContext.Provider>
  );
}
