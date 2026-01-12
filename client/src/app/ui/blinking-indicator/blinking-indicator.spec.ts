import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlinkingIndicator } from './blinking-indicator';

describe('BlinkingIndicator', () => {
  let component: BlinkingIndicator;
  let fixture: ComponentFixture<BlinkingIndicator>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlinkingIndicator]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BlinkingIndicator);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
