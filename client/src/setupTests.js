require('@testing-library/jest-dom');

jest.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }) => children,
  MemoryRouter: ({ children }) => children,
  Routes: ({ children }) => children,
  Route: () => null,
  Link: ({ children }) => children,
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/' }),
  useParams: () => ({}),
  useOutlet: () => null,
  Outlet: () => null,
  useLoaderData: () => ({}),
  useRevalidator: () => ({}),
  useAsyncValue: () => undefined,
  useAsyncError: () => undefined,
}), { virtual: true });

// Setup localStorage mock
const localStorageMock = {
  getItem: (key) => localStorage._store?.[key] || null,
  setItem: (key, value) => {
    if (!localStorage._store) localStorage._store = {};
    localStorage._store[key] = value.toString();
  },
  removeItem: (key) => {
    if (localStorage._store) delete localStorage._store[key];
  },
  clear: () => {
    localStorage._store = {};
  },
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Setup global fetch mock
global.fetch = jest.fn();

// Setup EventSource mock
global.EventSource = class MockEventSource {
  constructor(url) {
    this.url = url;
    this.readyState = 1;
    this.listeners = {};
  }
  addEventListener(event, handler) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(handler);
  }
  removeEventListener(event, handler) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(h => h !== handler);
    }
  }
  close() {
    this.readyState = 2;
  }
};

afterEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});
