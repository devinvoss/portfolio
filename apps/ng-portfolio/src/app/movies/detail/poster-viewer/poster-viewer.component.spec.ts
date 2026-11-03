import { TestBed } from '@angular/core/testing';
import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { PosterViewerComponent, PosterViewerData } from './poster-viewer.component';

describe('PosterViewerComponent', () => {
  let dialogRef: DialogRef<void, PosterViewerComponent>;
  let closed: boolean;

  const viewer = () => document.querySelector('portfolio-poster-viewer') as HTMLElement | null;

  beforeEach(() => {
    dialogRef = TestBed.inject(Dialog).open<void, PosterViewerData, PosterViewerComponent>(PosterViewerComponent, {
      data: { imageUrl: 'https://example.com/heat.jpg', title: 'Heat' },
      hasBackdrop: false,
    });
    closed = false;
    dialogRef.closed.subscribe(() => closed = true);
    TestBed.tick();
  });

  afterEach(() => TestBed.inject(Dialog).closeAll());

  it('shows the poster', () => {
    const img = viewer()?.querySelector('img');
    expect(img?.getAttribute('src')).toBe('https://example.com/heat.jpg');
    expect(img?.getAttribute('alt')).toBe('Heat poster');
  });

  it('closes from the X button', () => {
    (viewer()?.querySelector('.close-button') as HTMLButtonElement).click();
    expect(closed).toBe(true);
  });

  it('closes on Escape', () => {
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
    expect(closed).toBe(true);
  });

  it('closes when the dark area is clicked, but not the poster itself', () => {
    (viewer()?.querySelector('.poster') as HTMLImageElement).click();
    expect(closed).toBe(false);
    (viewer()?.querySelector('.viewer') as HTMLElement).click();
    expect(closed).toBe(true);
  });
});
