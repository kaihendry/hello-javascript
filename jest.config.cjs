module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.test.ts"],
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { isolatedModules: true }]
  },
};
