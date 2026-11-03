import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BottomSheet } from './BottomSheet';

describe('BottomSheet', () => {
  it('steps between snaps with the arrow keys and reports the height', () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1000 });
    const onHeightChange = vi.fn();
    render(
      <BottomSheet
        label="Trip"
        snaps={[0.3, 0.6, 0.9]}
        initialSnap={1}
        handleLabel="Resize panel"
        onHeightChange={onHeightChange}
        desktopClassName=""
      >
        <p>content</p>
      </BottomSheet>,
    );
    const sheet = screen.getByRole('region', { name: 'Trip' });
    expect(sheet).toHaveStyle({ height: '600px' });
    expect(onHeightChange).toHaveBeenLastCalledWith(600);

    const handle = screen.getByRole('button', { name: 'Resize panel' });
    fireEvent.keyDown(handle, { key: 'ArrowUp' });
    expect(sheet).toHaveStyle({ height: '900px' });
    fireEvent.keyDown(handle, { key: 'ArrowDown' });
    fireEvent.keyDown(handle, { key: 'ArrowDown' });
    expect(sheet).toHaveStyle({ height: '300px' });
    expect(onHeightChange).toHaveBeenLastCalledWith(300);
  });
});
