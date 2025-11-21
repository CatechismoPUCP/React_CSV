// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-testing-library
import '@testing-library/jest-dom';

// Mock fs and path for Node.js APIs in browser environment
// These are needed for test data loading
global.require = jest.fn();
