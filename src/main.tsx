import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { TeamAuthGate } from './components/TeamAuthGate.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TeamAuthGate>
      <App />
    </TeamAuthGate>
  </StrictMode>,
);
