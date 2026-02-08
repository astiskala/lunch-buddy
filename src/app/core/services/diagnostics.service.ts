import {
  Injectable,
  inject,
  signal,
  effect,
  PLATFORM_ID,
  isDevMode,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { v4 as uuidv4 } from 'uuid';
import { firstValueFrom } from 'rxjs';
import {
  normalizeError,
  redact,
  NormalizedError,
} from '../utils/diagnostics.utils';
import { VersionService } from './version.service';

export interface DiagnosticEvent {
  timestamp: number;
  level: 'info' | 'warn' | 'error';
  area: string;
  message: string;
  correlationId?: string;
  route?: string;
  details?: unknown;
  error?: NormalizedError;
}

interface DiagnosticSession {
  supportCode: string;
  sessionId: string;
  writeKey: string;
  expiresAt: number;
}

@Injectable({
  providedIn: 'root',
})
export class DiagnosticsService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly versionService = inject(VersionService);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly hasStorage = this.canUseLocalStorage();

  readonly isEnabled = signal<boolean>(false);
  readonly session = signal<DiagnosticSession | null>(null);

  private eventBuffer: DiagnosticEvent[] = [];
  private readonly MAX_BUFFER_SIZE = 500;
  private readonly FLUSH_INTERVAL = 30000; // 30s
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (this.isBrowser) {
      this.loadState();

      effect(() => {
        const enabled = this.isEnabled();
        if (enabled) {
          this.startFlushTimer();
        } else {
          this.stopFlushTimer();
        }
        this.saveState();
      });
    }
  }

  private loadState() {
    if (!this.hasStorage) {
      return;
    }

    const saved = localStorage.getItem('diag_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<{
          isEnabled: boolean;
          session: DiagnosticSession;
        }>;
        this.isEnabled.set(parsed.isEnabled ?? false);
        this.session.set(parsed.session ?? null);
      } catch (e) {
        if (isDevMode()) {
          console.error('Failed to load diagnostics state', e);
        }
      }
    }
  }

  private saveState() {
    if (!this.hasStorage) {
      return;
    }

    const state = {
      isEnabled: this.isEnabled(),
      session: this.session(),
    };
    localStorage.setItem('diag_config', JSON.stringify(state));
  }

  async enable() {
    if (this.session()) return;

    try {
      const resp = await firstValueFrom(
        this.http.post<DiagnosticSession>('/api/diagnostics/session', {
          buildInfo: { version: this.versionService.getVersion() },
        })
      );

      this.session.set(resp);
      this.isEnabled.set(true);
      this.log('info', 'diagnostics', 'Diagnostic logging enabled');
      void this.flush();
    } catch (e) {
      if (isDevMode()) {
        console.error('Failed to enable diagnostics', e);
      }
      this.isEnabled.set(false);
    }
  }

  async disable(deleteLogs = false) {
    const currentSession = this.session();
    if (deleteLogs && currentSession) {
      try {
        await firstValueFrom(
          this.http.request('DELETE', '/api/diagnostics/session', {
            body: {
              supportCode: currentSession.supportCode,
              writeKey: currentSession.writeKey,
            },
          })
        );
      } catch (e) {
        if (isDevMode()) {
          console.error('Failed to delete server logs', e);
        }
      }
    }

    this.isEnabled.set(false);
    this.session.set(null);
    this.eventBuffer = [];
    this.stopFlushTimer();
    if (this.hasStorage) {
      localStorage.removeItem('diag_config');
    }
  }

  log(
    level: 'info' | 'warn' | 'error',
    area: string,
    message: string,
    details?: unknown,
    error?: unknown
  ) {
    if (!this.isEnabled()) return;

    const event: DiagnosticEvent = {
      timestamp: Date.now(),
      level,
      area,
      message,
      correlationId: uuidv4(),
      details: redact(details),
      error: error ? normalizeError(error) : undefined,
    };

    if (isDevMode()) {
      console.debug(`[Diagnostics][${area}] ${message}`, event);
    }

    this.eventBuffer.push(event);
    if (this.eventBuffer.length >= this.MAX_BUFFER_SIZE) {
      this.eventBuffer.shift();
    }
  }

  async flush() {
    const currentSession = this.session();
    if (!currentSession || this.eventBuffer.length === 0) return;

    const eventsToFlush = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      await firstValueFrom(
        this.http.post('/api/diagnostics/event', {
          supportCode: currentSession.supportCode,
          writeKey: currentSession.writeKey,
          events: eventsToFlush,
        })
      );
    } catch (e) {
      if (isDevMode()) {
        console.error('Failed to flush diagnostic events', e);
      }
      this.eventBuffer = [
        ...eventsToFlush.slice(-50),
        ...this.eventBuffer,
      ].slice(0, this.MAX_BUFFER_SIZE);
    }
  }

  private startFlushTimer() {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => void this.flush(), this.FLUSH_INTERVAL);
  }

  private stopFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private canUseLocalStorage(): boolean {
    if (!this.isBrowser) {
      return false;
    }

    try {
      const testKey = '__diag_storage_test__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }
}
