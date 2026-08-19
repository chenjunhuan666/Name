import { useContext } from 'react';
import { NamingContext } from './namingContext';

export function useNaming() {
  const context = useContext(NamingContext);

  if (!context) {
    throw new Error('useNaming 必须在 NamingProvider 内使用');
  }

  return context;
}
