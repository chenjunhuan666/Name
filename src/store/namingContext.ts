import { createContext } from 'react';
import type { Dispatch } from 'react';
import type { NamingAction, NamingState } from './namingStore';

export interface NamingContextValue {
  state: NamingState;
  dispatch: Dispatch<NamingAction>;
}

export const NamingContext = createContext<NamingContextValue | undefined>(
  undefined,
);
