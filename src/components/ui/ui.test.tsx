import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Chip, Switch } from './Controls';
import { nextTrapIndex } from './focus';
import { Modal } from './Modal';

describe('Switch', () => {
  it('exposes its state and toggles with the keyboard', async () => {
    const user = userEvent.setup();
    function Harness() {
      const [on, setOn] = useState(false);
      return <Switch checked={on} label="Netflix" onChange={() => setOn((v) => !v)} />;
    }
    render(<Harness />);
    const sw = screen.getByRole('switch', { name: 'Netflix' });
    expect(sw).toHaveAttribute('aria-checked', 'false');
    sw.focus();
    await user.keyboard(' ');
    expect(sw).toHaveAttribute('aria-checked', 'true');
  });
});

describe('Chip', () => {
  it('reports pressed state and respects disabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <>
        <Chip pressed onClick={onClick}>
          Food
        </Chip>
        <Chip disabled onClick={onClick}>
          Fun
        </Chip>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Food' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Fun' }));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('Modal', () => {
  it('traps focus, closes on Escape and labels itself', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal labelledBy="t" onClose={onClose}>
        <h2 id="t">Title</h2>
        <button type="button">One</button>
        <button type="button">Two</button>
      </Modal>,
    );
    expect(screen.getByRole('dialog', { name: 'Title' })).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: 'One' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Two' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'One' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Two' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('nextTrapIndex wraps only at the edges', () => {
    expect(nextTrapIndex(3, 2, false)).toBe(0);
    expect(nextTrapIndex(3, 0, true)).toBe(2);
    expect(nextTrapIndex(3, 1, false)).toBe(-1);
    expect(nextTrapIndex(3, -1, false)).toBe(0);
    expect(nextTrapIndex(0, -1, false)).toBe(-1);
  });
});
