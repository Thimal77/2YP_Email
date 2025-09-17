module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/index.js'
  ],
  coverageDirectory: 'coverage',
  testMatch: ['**/tests/unit/**/*.test.js'],
  setupFiles: ['<rootDir>/tests/setup.js'],
  moduleNameMapper: {
  "^../../../../db/db.js$": "<rootDir>/tests/__mocks__/db.js"
}

};