import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/global.css';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import MoreEventCard from './components/ui/MoreEventCard';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      {/* <MoreEventCard /> */}
    </BrowserRouter>
  </React.StrictMode>
);
