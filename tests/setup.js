// Vitest test setup — runs before every test file
import '@testing-library/jest-dom';

// Mock localStorage for tests
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index) => Object.keys(store)[index] ?? null,
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Mock sessionStorage
Object.defineProperty(globalThis, 'sessionStorage', { value: localStorageMock });

// Mock URL for share tests
if (!globalThis.URL.createObjectURL) {
  globalThis.URL.createObjectURL = () => 'blob:test';
}
if (!globalThis.URL.revokeObjectURL) {
  globalThis.URL.revokeObjectURL = () => {};
}
