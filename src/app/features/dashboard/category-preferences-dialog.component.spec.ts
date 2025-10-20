import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { CategoryPreferencesDialogComponent } from './category-preferences-dialog.component';
import { PushNotificationService } from '../../shared/services/push-notification.service';

const createToggleEvent = (checked: boolean): Event =>
  ({
    target: Object.assign(document.createElement('input'), {
      type: 'checkbox',
      checked,
    }),
  }) as unknown as Event;

describe('CategoryPreferencesDialogComponent notifications', () => {
  let fixture: ComponentFixture<CategoryPreferencesDialogComponent>;
  let component: CategoryPreferencesDialogComponent;
  let ensurePermissionSpy: jasmine.Spy;

  beforeEach(async () => {
    ensurePermissionSpy = jasmine
      .createSpy('ensurePermission')
      .and.resolveTo(true);

    await TestBed.configureTestingModule({
      imports: [CategoryPreferencesDialogComponent],
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: PushNotificationService,
          useValue: {
            ensurePermission: ensurePermissionSpy,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryPreferencesDialogComponent);
    component = fixture.componentInstance;
  });

  it('requests permission when enabling notifications', async () => {
    const event = createToggleEvent(true);

    await component.handleNotificationsChange(event);

    expect(ensurePermissionSpy).toHaveBeenCalled();
    expect(component.notificationsEnabled()).toBeTrue();
  });

  it('reverts the toggle when permission is denied', async () => {
    ensurePermissionSpy.and.resolveTo(false);
    const event = createToggleEvent(true);
    const input = event.target as HTMLInputElement;

    await component.handleNotificationsChange(event);

    expect(ensurePermissionSpy).toHaveBeenCalled();
    expect(component.notificationsEnabled()).toBeFalse();
    expect(input.checked).toBeFalse();
  });

  it('does not request permission when disabling notifications', async () => {
    component.notificationsEnabled.set(true);
    const event = createToggleEvent(false);

    await component.handleNotificationsChange(event);

    expect(ensurePermissionSpy).not.toHaveBeenCalled();
    expect(component.notificationsEnabled()).toBeFalse();
  });
});
