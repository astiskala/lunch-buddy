import { Injectable, isDevMode } from '@angular/core';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

@Injectable({
  providedIn: 'root',
})
export class LoggerService {
  private readonly isDev = isDevMode();

  debug(message: string, ...args: unknown[]): void {
    if (this.isDev) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.isDev) {
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.isDev) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  error(message: string, error?: unknown, ...args: unknown[]): void {
    if (this.isDev) {
      console.error(`[ERROR] ${message}`, error, ...args);
    }
  }
}
