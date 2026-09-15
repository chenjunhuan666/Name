import { createHashRouter } from 'react-router-dom';
import { App } from './App';
import { RouteHydrateFallback } from './components/RouteHydrateFallback';
import { HomePage } from './pages/Home';

export const router = createHashRouter([
  {
    path: '/',
    element: <App />,
    hydrateFallbackElement: <RouteHydrateFallback />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: 'analysis',
        lazy: async () => ({
          Component: (await import('./pages/Analysis')).AnalysisPage,
        }),
      },
      {
        path: 'names',
        lazy: async () => ({
          Component: (await import('./pages/Names')).NamesPage,
        }),
      },
      {
        path: 'names/:nameId',
        lazy: async () => ({
          Component: (await import('./pages/NameDetail')).NameDetailPage,
        }),
      },
      {
        path: 'records',
        lazy: async () => ({
          Component: (await import('./pages/Records')).RecordsPage,
        }),
      },
      {
        path: '*',
        lazy: async () => ({
          Component: (await import('./pages/NotFound')).NotFoundPage,
        }),
      },
    ],
  },
]);
