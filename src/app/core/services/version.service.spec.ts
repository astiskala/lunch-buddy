import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';

import { VersionService } from './version.service';
import { version } from '../../../environments/version';

describe('VersionService', () => {
  let service: VersionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    service = TestBed.inject(VersionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return the correct version', () => {
    expect(service.getVersion()).toBe(version.version);
  });
});
