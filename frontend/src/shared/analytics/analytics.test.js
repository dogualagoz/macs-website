import {
  GA_DISABLE_KEY,
  GA_MEASUREMENT_ID,
  GTAG_SCRIPT_SRC,
  cookieDomainsFor,
  denyConsent,
  grantConsent,
  initAnalytics,
  isUntrackedPath,
  resetAnalyticsForTests,
  setAnalyticsEnabledForTests,
  syncAnalyticsRoute,
} from './analytics';
import { CONSENT_STORAGE_KEY, readConsent } from './consent';
import { TITLE_WAIT_MS, waitForTitleChange } from './pageTitle';

const commands = () => (window.dataLayer || []).map((entry) => Array.from(entry));
const gtagScripts = () => document.querySelectorAll(`script[src="${GTAG_SCRIPT_SRC}"]`);
const pageViews = () => commands().filter(([cmd, name]) => cmd === 'event' && name === 'page_view');
const indexOfCommand = (...prefix) =>
  commands().findIndex((entry) => prefix.every((value, i) => entry[i] === value));

const clearCookies = () => {
  document.cookie.split(';').forEach((part) => {
    const name = part.split('=')[0].trim();
    if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  });
};

// Varsayılan: sayfanın başlığı index.html'inkinden (bootTitle) farklı, yani
// kayıtlı onayla gtag.js hemen yüklenir. Bekleme davranışı ayrı test edilir.
const BOOT_TITLE = 'MACS - index.html';
const PAGE_TITLE = 'Etkinlikler | MACS';

beforeEach(() => {
  document.title = BOOT_TITLE;
  resetAnalyticsForTests();
  document.title = PAGE_TITLE;
  setAnalyticsEnabledForTests(true);
  window.localStorage.clear();
  clearCookies();
  window.history.replaceState(null, '', '/');
});

afterAll(() => {
  resetAnalyticsForTests();
});

describe('analytics consent', () => {
  test('consent defaults to denied for every storage type and loads nothing', () => {
    initAnalytics();

    expect(commands()[0]).toEqual([
      'consent',
      'default',
      {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      },
    ]);
    expect(gtagScripts()).toHaveLength(0);
    expect(commands().some(([cmd]) => cmd === 'config')).toBe(false);
  });

  test('is a no-op outside production', () => {
    setAnalyticsEnabledForTests(null);
    initAnalytics();
    grantConsent();

    expect(window.dataLayer).toBeUndefined();
    expect(gtagScripts()).toHaveLength(0);
    // Tercih yine de kaydedilir; bant tekrar sorulmasın.
    expect(readConsent()).toBe('granted');
  });

  test('grant updates consent, injects gtag.js once and configures GA with its own page views', () => {
    initAnalytics();
    grantConsent();
    grantConsent();

    expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toBe('granted');
    expect(gtagScripts()).toHaveLength(1);
    expect(gtagScripts()[0].async).toBe(true);
    expect(commands()).toContainEqual(['consent', 'update', { analytics_storage: 'granted' }]);
    expect(commands().filter(([cmd]) => cmd === 'js')).toHaveLength(1);
    expect(commands().filter(([cmd]) => cmd === 'config')).toEqual([
      ['config', GA_MEASUREMENT_ID, { anonymize_ip: true }],
    ]);
    // ad_* hiç granted yapılmaz.
    const updates = commands().filter(([cmd, action]) => cmd === 'consent' && action === 'update');
    updates.forEach(([, , params]) => expect(Object.keys(params)).toEqual(['analytics_storage']));
  });

  test('never sends a manual page_view: GA4 counts pages itself', () => {
    window.history.replaceState(null, '', '/etkinlikler?tur=atolye');
    initAnalytics();
    grantConsent();
    grantConsent();
    syncAnalyticsRoute('/hakkimizda');

    expect(pageViews()).toHaveLength(0);
    expect(commands().filter(([cmd]) => cmd === 'event')).toHaveLength(0);
    // Tek config: GA'nın ilk page_view'i bir kez gider.
    expect(commands().filter(([cmd]) => cmd === 'config')).toHaveLength(1);
  });

  test('kill switch is on until consent is granted and is off before config runs', () => {
    initAnalytics();
    expect(window[GA_DISABLE_KEY]).toBe(true);

    const seen = [];
    const original = window.dataLayer.push.bind(window.dataLayer);
    window.dataLayer.push = (entry) => {
      if (entry[0] === 'config') seen.push(window[GA_DISABLE_KEY]);
      return original(entry);
    };
    grantConsent();

    expect(seen).toEqual([false]);
    expect(window[GA_DISABLE_KEY]).toBe(false);
  });

  test('stored grant loads gtag.js on init', () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, 'granted');
    initAnalytics();

    expect(gtagScripts()).toHaveLength(1);
    expect(commands()).toContainEqual(['consent', 'update', { analytics_storage: 'granted' }]);
  });

  test('deny never injects gtag.js', () => {
    initAnalytics();
    denyConsent();

    expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toBe('denied');
    expect(gtagScripts()).toHaveLength(0);
    expect(commands().some(([cmd]) => cmd === 'config' || cmd === 'event')).toBe(false);
  });

  test('stored deny does not load gtag.js on init', () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, 'denied');
    initAnalytics();

    expect(gtagScripts()).toHaveLength(0);
  });

  test('grant then deny revokes analytics storage and clears GA cookies', () => {
    initAnalytics();
    grantConsent();
    document.cookie = '_ga=GA1.1.123.456; path=/';
    document.cookie = '_ga_YEQ7P91BTC=GS1.1.789; path=/';
    document.cookie = 'keep_me=1; path=/';

    denyConsent();

    expect(commands()).toContainEqual(['consent', 'update', { analytics_storage: 'denied' }]);
    expect(document.cookie).not.toMatch(/_ga/);
    expect(document.cookie).toContain('keep_me=1');
    expect(readConsent()).toBe('denied');
    // gtag.js yüklü kalsa da kill switch açık: çerezsiz ping bile gitmez.
    expect(window[GA_DISABLE_KEY]).toBe(true);
    syncAnalyticsRoute('/etkinlikler');
    expect(window[GA_DISABLE_KEY]).toBe(true);
  });

  test('unreadable storage is treated as no choice', () => {
    const spy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    try {
      expect(readConsent()).toBeNull();
      initAnalytics();
      expect(gtagScripts()).toHaveLength(0);
    } finally {
      spy.mockRestore();
    }
  });

  test('blocked storage writes do not break granting', () => {
    const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    try {
      initAnalytics();
      expect(() => grantConsent()).not.toThrow();
      expect(gtagScripts()).toHaveLength(1);
    } finally {
      spy.mockRestore();
    }
  });
});

describe('analytics consent ordering and lifecycle', () => {
  test('dataLayer entries are Arguments objects, not arrays (gtag.js ignores arrays)', () => {
    initAnalytics();
    grantConsent();

    expect(window.dataLayer.length).toBeGreaterThan(0);
    window.dataLayer.forEach((entry) => {
      expect(Array.isArray(entry)).toBe(false);
      expect(Object.prototype.toString.call(entry)).toBe('[object Arguments]');
    });
  });

  test('consent default comes before consent update, which comes before config', () => {
    initAnalytics();
    grantConsent();

    const defaultAt = indexOfCommand('consent', 'default');
    const updateAt = indexOfCommand('consent', 'update');
    const configAt = indexOfCommand('config');
    expect(defaultAt).toBe(0);
    expect(defaultAt).toBeLessThan(updateAt);
    expect(updateAt).toBeLessThan(configAt);
  });

  test('stored grant on init also orders default < update < config', () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, 'granted');
    initAnalytics();

    expect(indexOfCommand('consent', 'default')).toBe(0);
    expect(indexOfCommand('consent', 'update')).toBeLessThan(indexOfCommand('config'));
  });

  test('grant, deny, grant keeps exactly one gtag.js script and one config', () => {
    initAnalytics();
    grantConsent();
    denyConsent();
    grantConsent();

    expect(gtagScripts()).toHaveLength(1);
    expect(commands().filter(([cmd]) => cmd === 'config')).toHaveLength(1);
    expect(commands().filter(([cmd]) => cmd === 'js')).toHaveLength(1);
    const updates = commands()
      .filter(([cmd, action]) => cmd === 'consent' && action === 'update')
      .map(([, , params]) => params.analytics_storage);
    expect(updates).toEqual(['granted', 'denied', 'granted']);
    expect(readConsent()).toBe('granted');
  });

  test('deny deletes GA cookies on the host and every parent domain', () => {
    initAnalytics();
    grantConsent();
    document.cookie = '_ga=GA1.1.123.456; path=/';
    document.cookie = '_ga_YEQ7P91BTC=GS1.1.789; path=/';

    const descriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
    const writes = [];
    const spy = jest.spyOn(document, 'cookie', 'set').mockImplementation((value) => {
      writes.push(value);
      descriptor.set.call(document, value);
    });
    try {
      denyConsent();
    } finally {
      spy.mockRestore();
    }

    const host = window.location.hostname;
    ['_ga', '_ga_YEQ7P91BTC'].forEach((name) => {
      const forName = writes.filter((w) => w.startsWith(`${name}=;`));
      expect(forName.every((w) => /max-age=0/.test(w) && /path=\//.test(w))).toBe(true);
      expect(forName.some((w) => !/domain=/.test(w))).toBe(true);
      cookieDomainsFor(host).forEach((domain) => {
        expect(forName).toContainEqual(expect.stringContaining(`domain=${domain}`));
      });
    });
  });
});

describe('cookieDomainsFor', () => {
  test('lists the host and every parent domain for a multi-label hostname', () => {
    expect(cookieDomainsFor('www.macsclub.com.tr')).toEqual([
      'www.macsclub.com.tr',
      '.www.macsclub.com.tr',
      '.macsclub.com.tr',
      '.com.tr',
    ]);
  });

  test('includes the registrable domain GA writes to', () => {
    expect(cookieDomainsFor('macsclub.com.tr')).toContain('.macsclub.com.tr');
  });

  test('single-label host yields only itself', () => {
    expect(cookieDomainsFor('localhost')).toEqual(['localhost']);
  });
});

describe('untracked routes', () => {
  test('stored grant does not inject gtag.js when initializing on /admin', () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, 'granted');
    initAnalytics('/admin/dashboard');

    expect(gtagScripts()).toHaveLength(0);
    expect(commands().some(([cmd, action]) => cmd === 'consent' && action === 'update')).toBe(false);
    expect(window[GA_DISABLE_KEY]).toBe(true);
  });

  test('syncAnalyticsRoute on /Admin (any case) with stored grant injects nothing', () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, 'granted');
    syncAnalyticsRoute('/Admin');
    syncAnalyticsRoute('/LOGIN');

    expect(gtagScripts()).toHaveLength(0);
    expect(window[GA_DISABLE_KEY]).toBe(true);
  });

  test('stored grant loads gtag.js on the first tracked route after /admin', () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, 'granted');
    syncAnalyticsRoute('/admin');
    expect(gtagScripts()).toHaveLength(0);

    syncAnalyticsRoute('/etkinlikler');
    expect(window[GA_DISABLE_KEY]).toBe(false);
    expect(commands()).toContainEqual(['consent', 'update', { analytics_storage: 'granted' }]);
    // gtag.js yeni sayfanın başlığını bekler.
    expect(gtagScripts()).toHaveLength(0);
    document.title = 'Etkinlik listesi | MACS';
    return Promise.resolve().then(() => {
      expect(gtagScripts()).toHaveLength(1);

      syncAnalyticsRoute('/hakkimizda');
      expect(gtagScripts()).toHaveLength(1);
      expect(commands().filter(([cmd]) => cmd === 'config')).toHaveLength(1);
    });
  });


  test('kill switch is set on /admin and cleared on a public route once gtag is loaded', () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, 'granted');
    syncAnalyticsRoute('/');
    expect(gtagScripts()).toHaveLength(1);
    expect(window[GA_DISABLE_KEY]).toBe(false);

    syncAnalyticsRoute('/admin/users');
    expect(window[GA_DISABLE_KEY]).toBe(true);

    syncAnalyticsRoute('/login');
    expect(window[GA_DISABLE_KEY]).toBe(true);

    syncAnalyticsRoute('/etkinlikler');
    expect(window[GA_DISABLE_KEY]).toBe(false);
  });

  test('stored deny never loads gtag.js on any route', () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, 'denied');
    ['/admin', '/', '/etkinlikler'].forEach(syncAnalyticsRoute);

    expect(gtagScripts()).toHaveLength(0);
  });

  test('syncAnalyticsRoute is a no-op outside production', () => {
    setAnalyticsEnabledForTests(null);
    window.localStorage.setItem(CONSENT_STORAGE_KEY, 'granted');
    syncAnalyticsRoute('/admin');

    expect(window.dataLayer).toBeUndefined();
    expect(window[GA_DISABLE_KEY]).toBeUndefined();
  });
});

describe('isUntrackedPath', () => {
  test('isUntrackedPath matches whole segments only', () => {
    expect(isUntrackedPath('/admin')).toBe(true);
    expect(isUntrackedPath('/admin/content')).toBe(true);
    expect(isUntrackedPath('/login?x=1')).toBe(true);
    expect(isUntrackedPath('/')).toBe(false);
    expect(isUntrackedPath('/etkinlikler')).toBe(false);
    expect(isUntrackedPath('/administrasyon')).toBe(false);
  });

  test('isUntrackedPath is case-insensitive like React Router', () => {
    expect(isUntrackedPath('/Admin')).toBe(true);
    expect(isUntrackedPath('/ADMIN/dashboard')).toBe(true);
    expect(isUntrackedPath('/Login?next=/')).toBe(true);
    expect(isUntrackedPath('/Administrasyon')).toBe(false);
  });

  test('isUntrackedPath decodes percent-escapes like React Router', () => {
    expect(isUntrackedPath('/%61dmin')).toBe(true);
    expect(isUntrackedPath('/%6Cogin')).toBe(true);
    expect(isUntrackedPath('/%41DMIN/content')).toBe(true);
    expect(isUntrackedPath('/%61dministrasyon')).toBe(false);
    // Bozuk kaçış dizisi hata vermez, ham yol denenir.
    expect(() => isUntrackedPath('/admin/%E0%A4%A')).not.toThrow();
    expect(isUntrackedPath('/admin/%E0%A4%A')).toBe(true);
    expect(isUntrackedPath('/%E0%A4%A')).toBe(false);
  });

  test('a percent-encoded /admin navigation flips the kill switch', () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, 'granted');
    initAnalytics('/');
    expect(window[GA_DISABLE_KEY]).toBe(false);
    window.history.pushState(null, '', '/%61dmin');
    expect(window[GA_DISABLE_KEY]).toBe(true);
  });
});

describe('history guard (kill switch before GA sees the new URL)', () => {
  // GA4'ün geçmiş dinleyicisi gibi: kendi sarmalayıcısını sonradan kurar ve
  // asıl pushState döndükten sonra anahtarı okur.
  const installFakeGaListener = () => {
    const seen = [];
    const inner = window.history.pushState;
    window.history.pushState = function gaPushState(...args) {
      const result = inner.apply(this, args);
      seen.push([window.location.pathname, window[GA_DISABLE_KEY]]);
      return result;
    };
    const onPopState = () => {
      seen.push([window.location.pathname, window[GA_DISABLE_KEY]]);
    };
    window.addEventListener('popstate', onPopState);
    return {
      seen,
      restore: () => {
        window.history.pushState = inner;
        window.removeEventListener('popstate', onPopState);
      },
    };
  };
  // Tarayıcının geri tuşu gibi: adres sarmalayıcıdan geçmeden değişir, ardından
  // popstate gelir. Yalnızca popstate dinleyicisi anahtarı güncelleyebilir.
  const nativeReplace = (path) => History.prototype.replaceState.call(window.history, null, '', path);

  test('pushState into /admin or /login flips the switch before the navigation completes', () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, 'granted');
    initAnalytics('/');
    const ga = installFakeGaListener();
    try {
      window.history.pushState(null, '', '/hakkimizda');
      window.history.pushState(null, '', '/login');
      window.history.pushState(null, '', '/admin/dashboard?tab=1');
      // Farklı origin reddedilir: adres değişmez, anahtar açık kalmalı.
      expect(() => window.history.pushState(null, '', 'https://example.invalid/')).toThrow();
      expect(window.location.pathname).toBe('/admin/dashboard');
      expect(window[GA_DISABLE_KEY]).toBe(true);
    } finally {
      ga.restore();
    }

    expect(ga.seen).toEqual([
      ['/hakkimizda', false],
      ['/login', true],
      ['/admin/dashboard', true],
    ]);
  });

  test('replaceState updates the switch too, and a missing url keeps the current path', () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, 'granted');
    initAnalytics('/');

    window.history.replaceState(null, '', '/Admin');
    expect(window[GA_DISABLE_KEY]).toBe(true);
    window.history.replaceState({ any: 1 }, '');
    expect(window[GA_DISABLE_KEY]).toBe(true);
    window.history.replaceState(null, '', 'etkinlikler');
    expect(window.location.pathname).toBe('/etkinlikler');
    expect(window[GA_DISABLE_KEY]).toBe(false);
  });

  test('popstate (back button) updates the switch before later listeners run', () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, 'granted');
    initAnalytics('/');
    const ga = installFakeGaListener();
    try {
      nativeReplace('/login');
      expect(window[GA_DISABLE_KEY]).toBe(false);
      window.dispatchEvent(new PopStateEvent('popstate'));
      nativeReplace('/hakkimizda');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } finally {
      ga.restore();
    }

    expect(ga.seen).toEqual([
      ['/login', true],
      ['/hakkimizda', false],
    ]);
  });

  test('popstate listener runs in the capture phase and is removed with the same flag', () => {
    const add = jest.spyOn(window, 'addEventListener');
    const remove = jest.spyOn(window, 'removeEventListener');
    try {
      initAnalytics('/');
      const call = add.mock.calls.find(([type]) => type === 'popstate');
      expect(call).toBeDefined();
      expect(call[2]).toBe(true);

      resetAnalyticsForTests();
      expect(remove).toHaveBeenCalledWith('popstate', call[1], true);
    } finally {
      add.mockRestore();
      remove.mockRestore();
    }
  });

  test('popstate into /login with a pending stored-grant load cancels it', () => {
    jest.useFakeTimers();
    try {
      document.title = BOOT_TITLE;
      window.localStorage.setItem(CONSENT_STORAGE_KEY, 'granted');
      initAnalytics('/');
      expect(jest.getTimerCount()).toBe(1);

      nativeReplace('/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
      expect(jest.getTimerCount()).toBe(0);
      jest.advanceTimersByTime(TITLE_WAIT_MS * 2);
      expect(gtagScripts()).toHaveLength(0);
    } finally {
      jest.useRealTimers();
    }
  });

  test('without consent every navigation keeps the switch on', () => {
    initAnalytics('/');
    window.history.pushState(null, '', '/hakkimizda');
    expect(window[GA_DISABLE_KEY]).toBe(true);
  });

  test('is installed once and removed by the test reset', () => {
    const native = window.history.pushState;
    initAnalytics('/');
    const wrapped = window.history.pushState;
    expect(wrapped).not.toBe(native);
    initAnalytics('/');
    syncAnalyticsRoute('/hakkimizda');
    expect(window.history.pushState).toBe(wrapped);

    resetAnalyticsForTests();
    expect(window.history.pushState).toBe(native);
  });

  test('is not installed outside production', () => {
    setAnalyticsEnabledForTests(null);
    const native = window.history.pushState;
    initAnalytics('/');
    expect(window.history.pushState).toBe(native);
  });
});

describe('stored grant waits for the page title before loading gtag.js', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test('initial load on a lazy page: loads once the title leaves the index.html default', async () => {
    document.title = BOOT_TITLE;
    window.localStorage.setItem(CONSENT_STORAGE_KEY, 'granted');
    initAnalytics('/hakkimizda');

    expect(commands()).toContainEqual(['consent', 'update', { analytics_storage: 'granted' }]);
    expect(window[GA_DISABLE_KEY]).toBe(false);
    expect(gtagScripts()).toHaveLength(0);
    expect(commands().some(([cmd]) => cmd === 'config')).toBe(false);

    document.title = 'Hakkımızda - MACS';
    await Promise.resolve();

    expect(gtagScripts()).toHaveLength(1);
    expect(commands().filter(([cmd]) => cmd === 'config')).toHaveLength(1);
  });

  test('loads after the timeout when the title never changes', () => {
    jest.useFakeTimers();
    document.title = BOOT_TITLE;
    window.localStorage.setItem(CONSENT_STORAGE_KEY, 'granted');
    initAnalytics('/');
    syncAnalyticsRoute('/');

    jest.advanceTimersByTime(TITLE_WAIT_MS - 1);
    expect(gtagScripts()).toHaveLength(0);
    jest.advanceTimersByTime(1);
    expect(gtagScripts()).toHaveLength(1);
    expect(commands().filter(([cmd]) => cmd === 'config')).toHaveLength(1);
  });

  test('deny during the wait cancels the load', () => {
    jest.useFakeTimers();
    document.title = BOOT_TITLE;
    window.localStorage.setItem(CONSENT_STORAGE_KEY, 'granted');
    initAnalytics('/');
    expect(jest.getTimerCount()).toBe(1);
    denyConsent();

    expect(jest.getTimerCount()).toBe(0);
    jest.advanceTimersByTime(TITLE_WAIT_MS * 2);
    expect(gtagScripts()).toHaveLength(0);
    expect(window[GA_DISABLE_KEY]).toBe(true);
  });

  test('Accept click without a prior init does not wait either', () => {
    document.title = BOOT_TITLE;
    grantConsent();

    expect(gtagScripts()).toHaveLength(1);
    expect(commands().filter(([cmd]) => cmd === 'config')).toHaveLength(1);
  });

  test('Accept click during a pending stored-grant wait loads immediately, once', () => {
    jest.useFakeTimers();
    document.title = BOOT_TITLE;
    window.localStorage.setItem(CONSENT_STORAGE_KEY, 'granted');
    initAnalytics('/');
    expect(gtagScripts()).toHaveLength(0);

    grantConsent();
    expect(gtagScripts()).toHaveLength(1);
    jest.advanceTimersByTime(TITLE_WAIT_MS * 2);
    expect(gtagScripts()).toHaveLength(1);
    expect(commands().filter(([cmd]) => cmd === 'config')).toHaveLength(1);
  });

  test('Accept click does not wait (the banner is shown on a rendered page)', () => {
    document.title = BOOT_TITLE;
    initAnalytics('/');
    grantConsent();

    expect(gtagScripts()).toHaveLength(1);
  });
});

describe('pending stored-grant load and untracked routes', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    document.title = BOOT_TITLE;
    window.localStorage.setItem(CONSENT_STORAGE_KEY, 'granted');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const consentUpdates = () =>
    commands()
      .filter(([cmd, action]) => cmd === 'consent' && action === 'update')
      .map(([, , params]) => params.analytics_storage);

  test('navigating to /login during the title wait cancels the load', () => {
    initAnalytics('/hakkimizda');
    expect(jest.getTimerCount()).toBe(1);

    window.history.pushState(null, '', '/login');
    syncAnalyticsRoute('/login');
    document.title = 'Giriş | MACS';
    jest.advanceTimersByTime(TITLE_WAIT_MS * 2);

    expect(jest.getTimerCount()).toBe(0);
    expect(gtagScripts()).toHaveLength(0);
    expect(window[GA_DISABLE_KEY]).toBe(true);
  });

  test('the history guard alone cancels the wait when entering /admin', () => {
    initAnalytics('/hakkimizda');
    window.history.pushState(null, '', '/admin');

    expect(jest.getTimerCount()).toBe(0);
    document.title = 'Yönetim | MACS';
    jest.advanceTimersByTime(TITLE_WAIT_MS * 2);
    expect(gtagScripts()).toHaveLength(0);
  });

  test('a wait that fires while on an untracked route does not inject', () => {
    initAnalytics('/hakkimizda');
    // Adres sarmalayıcıyı atlayarak değişti (iptal yok): geri çağrı kendisi
    // kontrol etmeli.
    History.prototype.pushState.call(window.history, null, '', '/login');
    jest.advanceTimersByTime(TITLE_WAIT_MS);

    expect(gtagScripts()).toHaveLength(0);
    expect(jest.getTimerCount()).toBe(0);
  });

  test('returning to a tracked route after a cancelled wait loads once without a second consent update', () => {
    initAnalytics('/hakkimizda');
    window.history.pushState(null, '', '/login');
    syncAnalyticsRoute('/login');
    document.title = 'Giriş | MACS';

    window.history.pushState(null, '', '/etkinlikler');
    document.title = 'Etkinlikler | MACS';
    syncAnalyticsRoute('/etkinlikler');

    expect(gtagScripts()).toHaveLength(1);
    expect(window[GA_DISABLE_KEY]).toBe(false);
    expect(consentUpdates()).toEqual(['granted']);
    expect(commands().filter(([cmd]) => cmd === 'config')).toHaveLength(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  test('/login direct load then navigating to an already-rendered page loads without waiting', () => {
    document.title = 'Giriş | MACS';
    initAnalytics('/login');
    syncAnalyticsRoute('/login');
    expect(gtagScripts()).toHaveLength(0);

    window.history.pushState(null, '', '/');
    // Helmet (defer={false}) yeni başlığı rota effect'inden önce yazar.
    document.title = 'MACS | Ana Sayfa';
    syncAnalyticsRoute('/');

    expect(gtagScripts()).toHaveLength(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  test('/login direct load then navigating to a lazy page waits for that page title', () => {
    document.title = 'Giriş | MACS';
    initAnalytics('/login');
    syncAnalyticsRoute('/login');

    window.history.pushState(null, '', '/hakkimizda');
    syncAnalyticsRoute('/hakkimizda');
    expect(gtagScripts()).toHaveLength(0);

    document.title = 'Hakkımızda | MACS';
    return Promise.resolve().then(() => {
      expect(gtagScripts()).toHaveLength(1);
    });
  });

  test('a /login title that arrives after the route sync is still the baseline for the next page', () => {
    // /login chunk'ı gelmeden rota effect'i çalışır (başlık hâlâ index.html'inki).
    initAnalytics('/login');
    syncAnalyticsRoute('/login');
    document.title = 'Giriş | MACS';

    // Lazy sayfaya geçiş: başlık henüz /login'inki; o başlıkla yüklenmemeli.
    window.history.pushState(null, '', '/hakkimizda');
    syncAnalyticsRoute('/hakkimizda');
    expect(gtagScripts()).toHaveLength(0);

    document.title = 'Hakkımızda | MACS';
    return Promise.resolve().then(() => {
      expect(gtagScripts()).toHaveLength(1);
    });
  });

  test('Accept on /login records consent but loads gtag.js on the first tracked route', () => {
    window.localStorage.clear();
    window.history.replaceState(null, '', '/login');
    document.title = 'Giriş | MACS';
    syncAnalyticsRoute('/login');

    grantConsent();
    expect(readConsent()).toBe('granted');
    expect(gtagScripts()).toHaveLength(0);
    expect(window[GA_DISABLE_KEY]).toBe(true);

    window.history.pushState(null, '', '/');
    document.title = 'MACS | Ana Sayfa';
    syncAnalyticsRoute('/');

    expect(gtagScripts()).toHaveLength(1);
    expect(consentUpdates()).toEqual(['granted']);
    expect(commands().filter(([cmd]) => cmd === 'config')).toHaveLength(1);
  });

  test('deny turns the kill switch on before the denied consent update is queued', () => {
    jest.useRealTimers();
    window.localStorage.clear();
    initAnalytics('/');
    grantConsent();

    const seen = [];
    const original = window.dataLayer.push.bind(window.dataLayer);
    window.dataLayer.push = (entry) => {
      if (entry[0] === 'consent' && entry[2].analytics_storage === 'denied') {
        seen.push(window[GA_DISABLE_KEY]);
      }
      return original(entry);
    };
    denyConsent();

    expect(seen).toEqual([true]);
  });
});

describe('waitForTitleChange', () => {
  test('returns null and calls back at once when the title already differs', () => {
    document.title = 'Yeni';
    const callback = jest.fn();
    expect(waitForTitleChange('Eski', callback)).toBeNull();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test('returns a cancel function while waiting', () => {
    jest.useFakeTimers();
    try {
      document.title = 'Aynı';
      const callback = jest.fn();
      const cancel = waitForTitleChange('Aynı', callback);
      expect(typeof cancel).toBe('function');
      cancel();
      jest.advanceTimersByTime(TITLE_WAIT_MS * 2);
      expect(callback).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });
});
