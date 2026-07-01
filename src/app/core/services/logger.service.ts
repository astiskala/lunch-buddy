import { Injectable, isDevMode } from '@angular/core';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

@Injectable({
  providedIn: 'root',
})
export class LoggerService {
  private readonly isDev = isDevMode();

  debug(message: string, ...arguments_: unknown[]): void {
    if (this.isDev) {
      console.debug(`[DEBUG] ${message}`, ...arguments_);
    }
  }

  info(message: string, ...arguments_: unknown[]): void {
    if (this.isDev) {
      console.info(`[INFO] ${message}`, ...arguments_);
    }
  }

  warn(message: string, ...arguments_: unknown[]): void {
    if (this.isDev) {
      console.warn(`[WARN] ${message}`, ...arguments_);
    }
  }

  error(message: string, error?: unknown, ...arguments_: unknown[]): void {
    if (this.isDev) {
      console.error(`[ERROR] ${message}`, error, ...arguments_);
    }
  }
}
