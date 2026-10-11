/** Responsive app frame: sidebar on desktop, top bar + bottom tab bar on phones. */
import type { ReactNode } from 'react';
import { MONTH_DAYS } from '../../config';
import { Icon } from '../ui/Icon';
import { TABS } from './tabs';
import type { TabId } from './tabs';

interface AppShellProps {
  tab: TabId;
  onTab: (tab: TabId) => void;
  day: number;
  onNextDay: () => void;
  children: ReactNode;
}

function Logo() {
  return (
    <p className="logo">
      <span className="logo-mark" aria-hidden="true">
        <Icon name="logo" />
      </span>
      <span>
        Broke But <br />
        Functional
      </span>
    </p>
  );
}

function NavButtons({ tab, onTab }: Pick<AppShellProps, 'tab' | 'onTab'>) {
  return (
    <>
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          className="nav-btn"
          aria-current={tab === t.id ? 'page' : undefined}
          onClick={() => onTab(t.id)}
        >
          <Icon name={t.icon} />
          <span>{t.label}</span>
        </button>
      ))}
    </>
  );
}

export function AppShell({ tab, onTab, day, onNextDay, children }: AppShellProps) {
  const lastDay = day >= MONTH_DAYS;
  const nextLabel = lastDay ? 'Start new month' : 'Next day';
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>

      <header className="mtop">
        <Logo />
        <p className="mday">
          Day {day}
          <span className="muted"> / {MONTH_DAYS}</span>
        </p>
        <button type="button" className="btn sm ink" onClick={onNextDay}>
          {nextLabel} {!lastDay && <Icon name="arrow" />}
        </button>
      </header>

      <div className="layout">
        <aside className="side" aria-label="Menu and month progress">
          <Logo />
          <nav className="nav" aria-label="Primary">
            <NavButtons tab={tab} onTab={onTab} />
          </nav>
          <section className="daycard" aria-labelledby="month-h">
            <h2 className="label" id="month-h">
              This month
            </h2>
            <p className="big-day">Day {day}</p>
            <div
              className="track"
              role="progressbar"
              aria-label="Month progress"
              aria-valuemin={1}
              aria-valuemax={MONTH_DAYS}
              aria-valuenow={day}
              aria-valuetext={`Day ${day} of ${MONTH_DAYS}`}
            >
              <i style={{ width: `${(day / MONTH_DAYS) * 100}%` }} />
            </div>
            <p className="small">{lastDay ? 'Last day of the month' : `${MONTH_DAYS - day} days to go`}</p>
            <button type="button" className="btn ink" onClick={onNextDay}>
              {nextLabel} {!lastDay && <Icon name="arrow" />}
            </button>
          </section>
        </aside>

        <main id="main" className="page" tabIndex={-1}>
          {children}
        </main>
      </div>

      <nav className="mnav" aria-label="Primary">
        <NavButtons tab={tab} onTab={onTab} />
      </nav>
    </>
  );
}
