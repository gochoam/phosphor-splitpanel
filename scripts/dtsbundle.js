require('dts-generator').generate({
  name: 'phosphor-splitpanel',
  main: 'phosphor-splitpanel/index',
  baseDir: 'lib',
  files: ['index.d.ts'],
  out: 'lib/phosphor-splitpanel.d.ts',
});
