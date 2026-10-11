import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from './App';
import { ToastProvider } from './components/ui/ToastProvider';
import { FinanceProvider } from './state/FinanceProvider';
import { example, ids, must } from './test/fixtures';

function renderApp() {
  const user = userEvent.setup();
  render(
    <FinanceProvider initialState={example()} newId={ids()} persist={false}>
      <ToastProvider>
        <App random={() => 0} />
      </ToastProvider>
    </FinanceProvider>,
  );
  return user;
}

/** The layout renders desktop and mobile navigation; CSS shows one. Use the first match. */
const first = (elements: HTMLElement[]) => must(elements[0], 'element');
const navTo = (name: string) => first(screen.getAllByRole('button', { name }));
const allowance = () => screen.getByTestId('today-allowance');

describe('Today', () => {
  it('shows what you can spend today and warns about running out', () => {
    renderApp();
    expect(screen.getByRole('heading', { level: 1, name: /your money today/i })).toBeInTheDocument();
    expect(allowance()).toHaveTextContent('₹102');
    expect(screen.getByText(/broke on Day 26/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Money health 41 out of 100/ })).toBeInTheDocument();
  });

  it('logs a spend, updates the allowance everywhere, and can undo it', async () => {
    const user = renderApp();
    await user.click(screen.getByRole('button', { name: /I spent money/ }));
    const dialog = screen.getByRole('dialog', { name: 'I spent money' });
    expect(screen.getByLabelText('Amount in rupees')).toHaveFocus();

    await user.type(screen.getByLabelText('Amount in rupees'), '50');
    expect(within(dialog).getByText(/After this you can spend/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Saved ₹50');
    expect(allowance()).toHaveTextContent('₹49');

    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(allowance()).toHaveTextContent('₹102');
  });

  it('validates the amount and explains the error', async () => {
    const user = renderApp();
    await user.click(screen.getByRole('button', { name: /I spent money/ }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter an amount above ₹0');
    expect(screen.getByLabelText('Amount in rupees')).toHaveAttribute('aria-invalid', 'true');
  });

  it('closes the dialog with Escape and returns focus to the button that opened it', async () => {
    const user = renderApp();
    const opener = screen.getByRole('button', { name: /I spent money/ });
    await user.click(opener);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('stores hostile text as plain text, never as markup', async () => {
    const user = renderApp();
    await user.click(screen.getByRole('button', { name: /I spent money/ }));
    await user.type(screen.getByLabelText('Amount in rupees'), '10');
    await user.type(screen.getByLabelText(/Note/), '<img src=x onerror=alert(1)>');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByText('img src=x onerror=alert(1)')).toBeInTheDocument();
  });

  it('pre-fills a surprise expense', async () => {
    const user = renderApp();
    await user.click(screen.getByRole('button', { name: /Surprise expense/ }));
    expect(screen.getByRole('dialog', { name: /surprise expense/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Amount in rupees')).toHaveValue('900');
    expect(screen.getByRole('switch', { name: 'This was unexpected' })).toHaveAttribute('aria-checked', 'true');
  });

  it('moves to the next day and reports auto-paid bills', async () => {
    const user = renderApp();
    await user.click(first(screen.getAllByRole('button', { name: /Next day/ })));
    expect(screen.getAllByText(/Day 13/).length).toBeGreaterThan(0);
    expect(screen.getByRole('status')).toHaveTextContent('Day 13.');
  });
});

describe('Can I afford it?', () => {
  it('answers before you buy, and nothing changes until you confirm', async () => {
    const user = renderApp();
    await user.click(navTo('Can I afford it?'));
    expect(screen.getByRole('heading', { level: 1, name: 'Can I afford it?' })).toHaveFocus();

    await user.type(screen.getByLabelText('Price (₹)'), '2499');
    expect(screen.getByText('Not now')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Price (₹)'));
    await user.type(screen.getByLabelText('Price (₹)'), '20');
    expect(screen.getByText('Go for it!')).toBeInTheDocument();
  });

  it('simulates a money-saving move and applies it on confirm', async () => {
    const user = renderApp();
    await user.click(navTo('Can I afford it?'));
    await user.click(screen.getByRole('button', { name: 'Cancel Netflix' }));
    expect(screen.getByRole('button', { name: 'Cancel Netflix' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Smart move!')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel it' }));
    expect(screen.getByRole('heading', { level: 1, name: /your money today/i })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Netflix cancelled');
  });

  it('opens a quick win from the Today page as a simulation', async () => {
    const user = renderApp();
    await user.click(screen.getByRole('button', { name: 'See effect: Cancel Netflix' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Can I afford it?' })).toBeInTheDocument();
    expect(screen.getByText('Smart move!')).toBeInTheDocument();
  });
});

describe('My money', () => {
  it('cancels a subscription with an accessible switch', async () => {
    const user = renderApp();
    await user.click(navTo('My money'));
    const sw = screen.getByRole('switch', { name: 'Netflix subscription' });
    expect(sw).toHaveAttribute('aria-checked', 'true');
    await user.click(sw);
    expect(screen.getByRole('switch', { name: 'Netflix subscription' })).toHaveAttribute('aria-checked', 'false');
  });

  it('shows linked validation errors when adding a bill', async () => {
    const user = renderApp();
    await user.click(navTo('My money'));
    await user.click(screen.getByRole('button', { name: /Add a bill/ }));
    expect(screen.getByLabelText('Name')).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Add it' }));
    expect(screen.getByText('Give the bill a name.')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Name')).toHaveFocus();

    await user.type(screen.getByLabelText('Name'), 'Gym');
    await user.type(screen.getByLabelText('Amount (₹)'), '400');
    await user.click(screen.getByRole('button', { name: 'Add it' }));
    expect(screen.getByText('Gym')).toBeInTheDocument();
  });

  it('asks for confirmation before resetting the month', async () => {
    const user = renderApp();
    await user.click(navTo('My money'));
    await user.click(screen.getByRole('button', { name: 'Start my own month' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Start your own month?' });
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await user.click(within(dialog).getByRole('button', { name: 'Start fresh' }));
    expect(screen.getAllByText(/Day 1\b/).length).toBeGreaterThan(0);
  });
});
