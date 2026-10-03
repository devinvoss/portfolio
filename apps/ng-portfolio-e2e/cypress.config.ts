import { defineConfig } from 'cypress';
import { nxE2EPreset } from '@nx/cypress/plugins/cypress-preset';

export default defineConfig({
  e2e: {
    ...nxE2EPreset(__dirname, {
      webServerCommands: {
        default: 'npx nx run ng-portfolio:serve:development',
        production: 'npx nx run ng-portfolio:serve:production',
      },
    }),
    baseUrl: 'http://localhost:4200',
  },
});
