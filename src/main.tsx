import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { NamingProvider } from './store/NamingProvider';
import './styles/global.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('未找到应用挂载节点 #root');
}

createRoot(rootElement).render(
  <StrictMode>
    <NamingProvider>
      <RouterProvider router={router} />
    </NamingProvider>
  </StrictMode>,
);
