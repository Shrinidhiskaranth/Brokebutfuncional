import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from './App';
import { FinanceProvider } from './context/FinanceProvider';
import { ToastProvider } from './context/ToastProvider';
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
  it('shows the daily allowance, the key metrics and the risk of running out', () => {
    renderApp();
    expect(screen.getByRole('heading', { level: 1, name: /your money today/i })).toBeInTheDocument();
    expect(allowance()).toHaveTextContent('₹102');
    expect(screen.getByText(/broke on Day 26/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Financial health 41 out of 100/ })).toBeInTheDocument();
    const metrics = screen.getByRole('region', { name: 'Month at a glance' });
    for (const label of ['Remaining balance', 'Daily allowance', 'Monthly forecast', 'Financial risk']) {
      expect(within(metrics).getByText(label)).toBeInTheDocument();
    }
    expect(within(metrics).getByText('High')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Monthly forecast: .* forecast −₹738 on Day 30/ })).toBeInTheDocument();
  });

  it('logs a spend, updates the allowance everywhere, and can undo it', async () => {
    const user = renderApp();
    await user.click(screen.getByRole('button', { name: /I spent money/ }));
    const dialog = await screen.findByRole('dialog', { name: 'I spent money' });
    await waitFor(() => expect(screen.getByLabelText('Amount in rupees')).toHaveFocus());

    await user.type(screen.getByLabelText('Amount in rupees'), '50');
    expect(within(dialog).getByText(/Daily allowance:/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Saved ₹50');
    expect(allowance()).toHaveTextContent('₹49');

    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(allowance()).toHaveTextContent('₹102');
  });

  it('records money coming in and raises the allowance', async () => {
    const user = renderApp();
    await user.click(screen.getByRole('button', { name: /Money in/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Money in' });
    await user.type(screen.getByLabelText('Amount in rupees'), '1500');
    await user.type(within(dialog).getByLabelText(/From where/), 'Freelance gig');
    await user.click(within(dialog).getByRole('button', { name: 'Add money' }));
    expect(screen.getByRole('status')).toHaveTextContent('Added ₹1,500');
    expect(allowance()).not.toHaveTextContent('₹102');
    expect(screen.getByText('Freelance gig')).toBeInTheDocument();
  });

  it('validates the amount and explains the error', async () => {
    const user = renderApp();
    await user.click(screen.getByRole('button', { name: /I spent money/ }));
    await user.click(await screen.findByRole('button', { name: 'Save' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter an amount above ₹0');
    expect(screen.getByLabelText('Amount in rupees')).toHaveAttribute('aria-invalid', 'true');
  });

  it('closes the dialog with Escape and returns focus to the button that opened it', async () => {
    const user = renderApp();
    const opener = screen.getByRole('button', { name: /I spent money/ });
    await user.click(opener);
    await screen.findByRole('dialog');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('stores hostile text as plain text, never as markup', async () => {
    const user = renderApp();
    await user.click(screen.getByRole('button', { name: /I spent money/ }));
    await screen.findByRole('dialog');
    await user.type(screen.getByLabelText('Amount in rupees'), '10');
    await user.type(screen.getByLabelText(/Note/), '<img src=x onerror=alert(1)>');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByText('img src=x onerror=alert(1)')).toBeInTheDocument();
  });

  it('pre-fills a surprise expense', async () => {
    const user = renderApp();
    await user.click(screen.getByRole('button', { name: /Surprise expense/ }));
    expect(await screen.findByRole('dialog', { name: /surprise expense/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Amount in rupees')).toHaveValue('900');
    expect(screen.getByRole('switch', { name: 'This was unexpected' })).toHaveAttribute('aria-checked', 'true');
  });

  it('moves to the next day and reports auto-paid bills', async () => {
    const user = renderApp();
    await user.click(first(screen.getAllByRole('button', { name: /Next day/ })));
    expect(screen.getAllByText(/Day 13/).length).toBeGreaterThan(0);
    expect(screen.getByRole('status')).toHaveTextContent('Day 13.');
  });

  it('switches between light and dark themes', async () => {
    const user = renderApp();
    const toggle = first(screen.getAllByRole('button', { name: /Switch to (dark|light) theme/ }));
    const before = document.documentElement.dataset.theme;
    await user.click(toggle);
    expect(document.documentElement.dataset.theme).not.toBe(before);
  });
});

describe('Can I afford it?', () => {
  it('answers before you buy, across all six measures, and nothing changes until you confirm', async () => {
    const user = renderApp();
    await user.click(navTo('Can I afford it?'));
    const heading = await screen.findByRole('heading', { level: 1, name: 'Can I afford it?' });
    await waitFor(() => expect(heading).toHaveFocus());

    await user.type(screen.getByLabelText('Price (₹)'), '2499');
    expect(screen.getByText('Not now')).toBeInTheDocument();
    for (const label of ['Remaining balance', 'Daily allowance', 'Savings goals funded', 'Monthly forecast', 'Financial risk', 'Financial health']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByRole('img', { name: /with this decision/ })).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Price (₹)'));
    await user.type(screen.getByLabelText('Price (₹)'), '20');
    expect(screen.getByText('Go for it!')).toBeInTheDocument();
  });

  it('simulates a money-saving move and applies it on confirm', async () => {
    const user = renderApp();
    await user.click(navTo('Can I afford it?'));
    await user.click(await screen.findByRole('button', { name: 'Cancel Netflix' }));
    expect(screen.getByRole('button', { name: 'Cancel Netflix' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Smart move!')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel it' }));
    expect(await screen.findByRole('heading', { level: 1, name: /your money today/i })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Netflix cancelled');
  });

  it('opens a quick win from the Today page as a simulation', async () => {
    const user = renderApp();
    await user.click(screen.getByRole('button', { name: 'See effect: Cancel Netflix' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Can I afford it?' })).toBeInTheDocument();
    expect(screen.getByText('Smart move!')).toBeInTheDocument();
  });
});

describe('My money', () => {
  it('cancels a subscription with an accessible switch', async () => {
    const user = renderApp();
    await user.click(navTo('My money'));
    const sw = await screen.findByRole('switch', { name: 'Netflix subscription' });
    expect(sw).toHaveAttribute('aria-checked', 'true');
    await user.click(sw);
    expect(screen.getByRole('switch', { name: 'Netflix subscription' })).toHaveAttribute('aria-checked', 'false');
  });

  it('shows linked validation errors when adding a bill', async () => {
    const user = renderApp();
    await user.click(navTo('My money'));
    await user.click(await screen.findByRole('button', { name: /Add a bill/ }));
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveFocus());
    await user.click(screen.getByRole('button', { name: 'Add it' }));
    expect(screen.getByText('Give the bill a name.')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Name')).toHaveFocus();

    await user.type(screen.getByLabelText('Name'), 'Gym');
    await user.type(screen.getByLabelText('Amount (₹)'), '400');
    await user.click(screen.getByRole('button', { name: 'Add it' }));
    expect(screen.getByText('Gym')).toBeInTheDocument();
  });

  it('creates and removes a savings goal', async () => {
    const user = renderApp();
    await user.click(navTo('My money'));
    await user.click(await screen.findByRole('button', { name: /New goal/ }));
    await user.click(screen.getByRole('button', { name: 'Create goal' }));
    expect(screen.getByText('Give the goal a name.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Goal name'), 'Goa trip');
    await user.type(screen.getByLabelText('Target (₹)'), '3000');
    await user.click(screen.getByRole('button', { name: 'Create goal' }));
    expect(screen.getByText('Goa trip')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Goa trip progress' })).toHaveAttribute('aria-valuenow', '0');

    const goal = must(screen.getByText('Goa trip').closest('li'), 'goal row');
    await user.click(within(goal).getByRole('button', { name: 'Remove goal' }));
    expect(screen.queryByText('Goa trip')).not.toBeInTheDocument();
  });

  it('asks for confirmation before resetting the month', async () => {
    const user = renderApp();
    await user.click(navTo('My money'));
    await user.click(await screen.findByRole('button', { name: 'Start my own month' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Start your own month?' });
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus());
    await user.click(within(dialog).getByRole('button', { name: 'Start fresh' }));
    expect(screen.getAllByText(/Day 1\b/).length).toBeGreaterThan(0);
  });
});
