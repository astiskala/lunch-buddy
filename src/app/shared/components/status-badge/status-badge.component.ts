import {
  ChangeDetectionStrategy,
  Component,
  input,
  computed,
} from '@angular/core';

export type StatusType = 'over' | 'at-risk' | 'on-track';

@Component({
  selector: 'app-status-badge',
  imports: [],
  template: `
    <div class="status-badge" [attr.data-status]="status()">
      <span>{{ label() }}</span>
    </div>
  `,
  styleUrls: ['./status-badge.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadgeComponent {
  readonly status = input.required<StatusType>();

  readonly label = computed(() => {
    switch (this.status()) {
      case 'over':
        return 'Over';
      case 'at-risk':
        return 'At risk';
      case 'on-track':
        return 'On track';
      default:
        return '';
    }
  });
}
