import {
  ChangeDetectionStrategy,
  Component,
  signal,
  output,
  input,
  inject,
  viewChild,
  ElementRef,
  effect,
  OnDestroy,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { LoggerService } from '../../core/services/logger.service';
import { toIsoDate } from '../../shared/utils/date.util';

@Component({
  selector: 'app-custom-period-dialog',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './custom-period-dialog.component.html',
  styleUrls: ['./custom-period-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomPeriodDialogComponent implements OnDestroy {
  private readonly logger = inject(LoggerService);
  private readonly document = inject(DOCUMENT);
  private readonly bodyScrollLockCountAttribute =
    'data-dialog-scroll-lock-count';
  private readonly bodyOverflowAttribute = 'data-dialog-original-overflow';
  private readonly bodyTouchActionAttribute =
    'data-dialog-original-touch-action';
  private isBodyScrollLocked = false;

  readonly dialogElement =
    viewChild.required<ElementRef<HTMLDialogElement>>('dialogElement');
  readonly open = input.required<boolean>();

  readonly dialogClose = output();
  readonly periodSelected = output<{ start: string; end: string }>();

  readonly startDate = signal(toIsoDate(new Date()));
  readonly endDate = signal(toIsoDate(new Date()));
  readonly validationError = signal<string | null>(null);

  constructor() {
    effect(() => {
      const dialog = this.dialogElement().nativeElement;
      const shouldOpen = this.open();

      if (!shouldOpen) {
        this.unlockBodyScroll();
        if (dialog.open && typeof dialog.close === 'function') {
          dialog.close();
        }
        dialog.removeAttribute('open');
        return;
      }

      this.lockBodyScroll();
      if (!dialog.open) {
        if (typeof dialog.showModal === 'function') {
          try {
            dialog.showModal();
            return;
          } catch (error) {
            this.logger.error('Failed to open dialog with showModal', error);
          }
        }
        dialog.setAttribute('open', '');
      }
    });
  }

  ngOnDestroy(): void {
    this.unlockBodyScroll();
  }

  handleStartDateChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.startDate.set(target.value);
    this.validationError.set(null);
  }

  handleEndDateChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.endDate.set(target.value);
    this.validationError.set(null);
  }

  handleSubmit(): void {
    const start = this.startDate();
    const end = this.endDate();

    if (!start || !end) {
      this.validationError.set('Please enter both a start and end date.');
      return;
    }

    if (start > end) {
      this.validationError.set('Start date must be before end date.');
      return;
    }

    this.periodSelected.emit({ start, end });
  }

  handleClose(): void {
    const dialog = this.dialogElement().nativeElement;
    if (dialog.open && typeof dialog.close === 'function') {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
    }
    this.unlockBodyScroll();
    this.dialogClose.emit();
  }

  private lockBodyScroll(): void {
    if (this.isBodyScrollLocked) {
      return;
    }

    const body = this.document.body;
    const rawLockCount = Number.parseInt(
      body.getAttribute(this.bodyScrollLockCountAttribute) ?? '0',
      10
    );
    const lockCount =
      Number.isFinite(rawLockCount) && rawLockCount > 0 ? rawLockCount : 0;
    if (lockCount === 0) {
      body.setAttribute(this.bodyOverflowAttribute, body.style.overflow);
      body.setAttribute(this.bodyTouchActionAttribute, body.style.touchAction);
      body.style.overflow = 'hidden';
      body.style.touchAction = 'none';
    }
    body.setAttribute(this.bodyScrollLockCountAttribute, String(lockCount + 1));
    this.isBodyScrollLocked = true;
  }

  private unlockBodyScroll(): void {
    if (!this.isBodyScrollLocked) {
      return;
    }

    const body = this.document.body;
    const lockCount = Number.parseInt(
      body.getAttribute(this.bodyScrollLockCountAttribute) ?? '0',
      10
    );
    const nextCount =
      Number.isFinite(lockCount) && lockCount > 0 ? lockCount - 1 : 0;

    if (nextCount === 0) {
      const previousOverflow =
        body.getAttribute(this.bodyOverflowAttribute) ?? '';
      const previousTouchAction =
        body.getAttribute(this.bodyTouchActionAttribute) ?? '';
      body.style.overflow = previousOverflow;
      body.style.touchAction = previousTouchAction;
      body.removeAttribute(this.bodyScrollLockCountAttribute);
      body.removeAttribute(this.bodyOverflowAttribute);
      body.removeAttribute(this.bodyTouchActionAttribute);
    } else {
      body.setAttribute(this.bodyScrollLockCountAttribute, String(nextCount));
    }

    this.isBodyScrollLocked = false;
  }
}
