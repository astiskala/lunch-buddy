import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type ProgressBarVariant = 'default' | 'hero';
export type ProgressBarStatus = 'success' | 'warning' | 'error' | 'neutral';

@Component({
  selector: 'app-progress-bar',
  templateUrl: './progress-bar.component.html',
  styleUrls: ['./progress-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressBarComponent {
  readonly spentPercent = input.required<number>();
  readonly projectedPercent = input<number>(0);
  readonly monthProgressPercent = input<number>();
  readonly variant = input<ProgressBarVariant>('default');
  readonly status = input<ProgressBarStatus>('neutral');
  readonly height = input<number>(); // Optional override
}
