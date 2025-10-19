import { Injectable } from '@angular/core';
import { version } from '../../../environments/version';

@Injectable({
  providedIn: 'root'
})
export class VersionService {
  getVersion(): string {
    return version.version;
  }
}
