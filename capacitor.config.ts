import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.workhours.dashboard',
  appName: '24H Work Dashboard',
  webDir: 'public',
  server: {
    url: 'https://work-hours-dashboard-liarzi.vercel.app',
    cleartext: true
  }
};

export default config;
