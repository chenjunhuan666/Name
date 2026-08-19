import { createHashRouter } from 'react-router-dom';
import { App } from './App';
import { AnalysisPage } from './pages/Analysis';
import { HomePage } from './pages/Home';
import { NameDetailPage } from './pages/NameDetail';
import { NamesPage } from './pages/Names';
import { NotFoundPage } from './pages/NotFound';

export const router = createHashRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'analysis', element: <AnalysisPage /> },
      { path: 'names', element: <NamesPage /> },
      { path: 'names/:nameId', element: <NameDetailPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
