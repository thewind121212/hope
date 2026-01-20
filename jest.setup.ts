import "@testing-library/jest-dom";

global.TextEncoder = require("util").TextEncoder;
global.TextDecoder = require("util").TextDecoder;
global.crypto = require("crypto").webcrypto;

afterEach(() => {
  jest.clearAllMocks();
});
