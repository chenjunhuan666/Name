import { useReducer } from 'react';
import type { PropsWithChildren } from 'react';
import { NamingContext } from './namingContext';
import { initialNamingState, namingReducer } from './namingStore';

export function NamingProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(namingReducer, initialNamingState);

  return (
    <NamingContext.Provider value={{ state, dispatch }}>
      {children}
    </NamingContext.Provider>
  );
}
