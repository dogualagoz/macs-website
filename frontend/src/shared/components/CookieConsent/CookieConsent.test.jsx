import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CookieConsent from './CookieConsent';
import Footer from '../layout/Footer';
import { CONSENT_STORAGE_KEY } from '../../analytics/consent';
import {
  GTAG_SCRIPT_SRC,
  resetAnalyticsForTests,
  setAnalyticsEnabledForTests,
} from '../../analytics/analytics';

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Footer />
      <CookieConsent />
    </MemoryRouter>
  );

const banner = () => screen.queryByRole('region', { name: 'Çerez tercihleri' });

beforeEach(() => {
  resetAnalyticsForTests();
  window.localStorage.clear();
});

afterAll(() => {
  resetAnalyticsForTests();
});

describe('CookieConsent', () => {
  test('shows on public pages when no choice is stored', () => {
    renderAt('/');

    expect(banner()).toBeInTheDocument();
    expect(banner()).toHaveTextContent(
      'Siteyi geliştirmek için ziyaret istatistiklerini Google Analytics ile ölçüyoruz. Bu, analitik çerezleri kullanır.'
    );
    expect(screen.getByRole('button', { name: 'Kabul et' })).toHaveClass('cookie-consent__button');
    expect(screen.getByRole('button', { name: 'Reddet' })).toHaveClass('cookie-consent__button');
  });

  test('hides after accepting and stores the choice', () => {
    renderAt('/etkinlikler');
    fireEvent.click(screen.getByRole('button', { name: 'Kabul et' }));

    expect(banner()).not.toBeInTheDocument();
    expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toBe('granted');
  });

  test('hides after rejecting, stores the choice and never loads gtag.js', () => {
    setAnalyticsEnabledForTests(true);
    renderAt('/etkinlikler');
    fireEvent.click(screen.getByRole('button', { name: 'Reddet' }));

    expect(banner()).not.toBeInTheDocument();
    expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toBe('denied');
    expect(document.querySelectorAll(`script[src="${GTAG_SCRIPT_SRC}"]`)).toHaveLength(0);
  });

  test('stays hidden when a choice is already stored', () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, 'denied');
    renderAt('/');

    expect(banner()).not.toBeInTheDocument();
  });

  test('"Kabul et" injects gtag.js and grants analytics storage', () => {
    setAnalyticsEnabledForTests(true);
    renderAt('/etkinlikler');
    fireEvent.click(screen.getByRole('button', { name: 'Kabul et' }));

    expect(document.querySelectorAll(`script[src="${GTAG_SCRIPT_SRC}"]`)).toHaveLength(1);
    const commands = window.dataLayer.map((entry) => Array.from(entry));
    expect(commands).toContainEqual(['consent', 'update', { analytics_storage: 'granted' }]);
  });

  test.each(['/admin', '/admin/dashboard', '/login', '/Admin', '/ADMIN/users', '/Login'])('is hidden on %s', (path) => {
    renderAt(path);

    expect(banner()).not.toBeInTheDocument();
  });

  test('footer link reopens the banner and lets the choice change', () => {
    renderAt('/');
    fireEvent.click(screen.getByRole('button', { name: 'Reddet' }));
    expect(banner()).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Çerez tercihleri' }));

    expect(banner()).toBeInTheDocument();
    expect(banner()).toHaveFocus();
    expect(banner()).toHaveTextContent('Şu anki tercihiniz: reddedildi.');

    fireEvent.click(screen.getByRole('button', { name: 'Kabul et' }));

    expect(banner()).not.toBeInTheDocument();
    expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toBe('granted');
  });

  test('focus returns to the footer button after choosing in a reopened banner', () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, 'denied');
    renderAt('/');
    const footerButton = screen.getByRole('button', { name: 'Çerez tercihleri' });
    footerButton.focus();
    fireEvent.click(footerButton);

    expect(banner()).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Kabul et' }));

    expect(banner()).not.toBeInTheDocument();
    expect(footerButton).toHaveFocus();
  });

  test('clicking the footer link while the banner is open moves focus back to the banner', () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, 'denied');
    renderAt('/');
    const footerButton = screen.getByRole('button', { name: 'Çerez tercihleri' });
    footerButton.focus();
    fireEvent.click(footerButton);
    expect(banner()).toHaveFocus();

    footerButton.focus();
    fireEvent.click(footerButton);

    expect(banner()).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Reddet' }));
    expect(footerButton).toHaveFocus();
  });

  test('Escape closes a reopened banner and restores focus without changing the choice', () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, 'denied');
    renderAt('/');
    const footerButton = screen.getByRole('button', { name: 'Çerez tercihleri' });
    footerButton.focus();
    fireEvent.click(footerButton);

    fireEvent.keyDown(banner(), { key: 'Escape' });

    expect(banner()).not.toBeInTheDocument();
    expect(footerButton).toHaveFocus();
    expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toBe('denied');
  });

  test('Escape does not dismiss the first-visit banner', () => {
    renderAt('/');
    fireEvent.keyDown(banner(), { key: 'Escape' });

    expect(banner()).toBeInTheDocument();
    expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toBeNull();
  });

  test('reopening keeps the last in-memory choice when storage is unreadable', () => {
    renderAt('/');
    fireEvent.click(screen.getByRole('button', { name: 'Reddet' }));

    const spy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    try {
      fireEvent.click(screen.getByRole('button', { name: 'Çerez tercihleri' }));
      expect(banner()).toHaveTextContent('Şu anki tercihiniz: reddedildi.');
    } finally {
      spy.mockRestore();
    }
  });

  test('footer link is present in the projects variant too', () => {
    render(
      <MemoryRouter initialEntries={['/projeler']}>
        <Footer variant="projects" />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: 'Çerez tercihleri' })).toBeInTheDocument();
  });
});
