import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SaContainerPage } from './sa-container.page';

describe('SaContainerPage', () => {
  let component: SaContainerPage;
  let fixture: ComponentFixture<SaContainerPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SaContainerPage ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SaContainerPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
