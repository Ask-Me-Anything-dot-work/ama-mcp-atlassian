/** @type {import('knip').KnipConfig} */
const config = {
  entry: ['src/index.ts'],
  project: ['src/**/*.ts', 'tests/**/*.ts'],
  ignoreDependencies: ['tsx'],
};

export default config;
