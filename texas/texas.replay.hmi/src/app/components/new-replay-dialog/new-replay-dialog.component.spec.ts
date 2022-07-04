import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NewReplayDialogComponent } from './new-replay-dialog.component';

describe('NewReplayDialogComponent', () => {
  let component: NewReplayDialogComponent;
  let fixture: ComponentFixture<NewReplayDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NewReplayDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NewReplayDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
