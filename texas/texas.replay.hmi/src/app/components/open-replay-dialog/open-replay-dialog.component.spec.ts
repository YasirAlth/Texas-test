import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { OpenReplayDialogComponent } from './open-replay-dialog.component';

describe('OpenReplayDialogComponent', () => {
  let component: OpenReplayDialogComponent;
  let fixture: ComponentFixture<OpenReplayDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ OpenReplayDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(OpenReplayDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
