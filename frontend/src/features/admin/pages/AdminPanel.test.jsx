import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AdminPanel from './AdminPanel';
import { useAuth } from '../../auth/context/AuthContext';

jest.mock('../../auth/context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('./Dashboard', () => () => <p>dashboard-page</p>);
jest.mock('./Content', () => () => <p>content-page</p>);
jest.mock('./Users', () => () => <p>users-page</p>);
jest.mock('./Members', () => () => <p>members-page</p>);

const renderAt = (path, role) => {
  useAuth.mockReturnValue({ hasRole: (...roles) => roles.includes(role) });
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/*" element={<AdminPanel />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('AdminPanel role routing', () => {
  test('admin can open user management', () => {
    renderAt('/admin/users', 'admin');
    expect(screen.getByText('users-page')).toBeInTheDocument();
  });

  test('moderator is sent back to the dashboard instead of a 403 page', () => {
    renderAt('/admin/users', 'moderator');
    expect(screen.queryByText('users-page')).not.toBeInTheDocument();
    expect(screen.getByText('dashboard-page')).toBeInTheDocument();
  });

  test('moderator keeps content management', () => {
    renderAt('/admin/content', 'moderator');
    expect(screen.getByText('content-page')).toBeInTheDocument();
  });

  test('removed logs page falls back to the dashboard', () => {
    renderAt('/admin/logs', 'admin');
    expect(screen.getByText('dashboard-page')).toBeInTheDocument();
  });
});
