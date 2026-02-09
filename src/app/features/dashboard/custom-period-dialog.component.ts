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
  WritableSignal,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { LoggerService } from '../../core/services/logger.service';
import { toIsoDate } from '../../shared/utils/date.util';
import {
  BodyScrollLockController,
  closeDialogElement,
  openDialogElement,
} from '../../shared/utils/dialog.util';

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
  private readonly bodyScrollLock = new BodyScrollLockController(
    this.document.body
  );

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
        this.bodyScrollLock.unlock();
        closeDialogElement(dialog);
        return;
      }

      this.bodyScrollLock.lock();
      openDialogElement(dialog, error => {
        this.logger.error('Failed to open dialog with showModal', error);
      });
    });
  }

  ngOnDestroy(): void {
    this.bodyScrollLock.unlock();
  }

  handleStartDateChange(event: Event): void {
    this.handleDateChange(event, this.startDate);
  }

  handleEndDateChange(event: Event): void {
    this.handleDateChange(event, this.endDate);
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
    closeDialogElement(dialog);
    this.bodyScrollLock.unlock();
    this.dialogClose.emit();
  }

  private handleDateChange(event: Event, target: WritableSignal<string>): void {
    target.set((event.target as HTMLInputElement).value);
    this.validationError.set(null);
  }
}
