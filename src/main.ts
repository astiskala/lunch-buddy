import { bootstrapApplication } from '@angular/platform-browser';
import { isDevMode } from '@angular/core';
import { appConfig } from './app/app.config';
import { App } from './app/app';

try {
  await bootstrapApplication(App, appConfig);
} catch (err: unknown) {
  if (isDevMode()) {
    console.error(err);
  }
}
