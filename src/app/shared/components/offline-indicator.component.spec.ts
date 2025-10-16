import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OfflineIndicatorComponent } from './offline-indicator.component';
import { OfflineService } from '../../core/services/offline.service';

describe('OfflineIndicatorComponent', () => {
  let component: OfflineIndicatorComponent;
  let fixture: ComponentFixture<OfflineIndicatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfflineIndicatorComponent],
      providers: [OfflineService],
    }).compileComponents();

    fixture = TestBed.createComponent(OfflineIndicatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
