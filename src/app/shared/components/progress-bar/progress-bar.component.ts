import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ProgressBarVariant = 'default' | 'hero';
export type ProgressBarStatus = 'success' | 'warning' | 'error' | 'neutral';

@Component({
  selector: 'app-progress-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="progress-bar-wrapper"
      [class]="variant()"
      [style.height.px]="height()">
      <div
        class="progress spent"
        [style.width.%]="spentPercent()"
        [attr.data-status]="status()"></div>

      @if (projectedPercent() > spentPercent()) {
        <div
          class="progress projected"
          [style.width.%]="projectedPercent() - spentPercent()"
          [style.left.%]="spentPercent()"
          [attr.data-status]="status()"></div>
      }

      @if (monthProgressPercent() !== undefined) {
        <div
          class="month-indicator"
          [style.left.%]="monthProgressPercent()"
          [attr.title]="'Month progress: ' + monthProgressPercent() + '%'">
          <div class="indicator-line"></div>
        </div>
      }
    </div>
  `,
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
