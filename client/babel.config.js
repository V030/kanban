module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    '@babel/preset-react',
    ['@babel/preset-typescript', { allExtensions: true, isTSX: true }],
  ],
  env: {
    test: {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        '@babel/preset-react',
        ['@babel/preset-typescript', { allExtensions: true, isTSX: true }],
      ],
    },
  },
};
