/** Responsive app frame: sidebar on desktop, top bar + bottom tab bar on phones. */
import type { ReactNode } from 'react';
import { MONTH_DAYS } from '../../constants';
import { Icon } from '../ui/Icon';
import { TABS } from '../../constants/navigation';
import type { TabId } from '../../constants/navigation';
import type { Theme } from '../../hooks/useTheme';

interface AppShellProps {
  tab: TabId;
  onTab: (tab: TabId) => void;
  day: number;
  onNextDay: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  children: ReactNode;
}

function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button type="button" className="btn sm theme-btn" aria-label={`Switch to ${next} theme`} title={`Switch to ${next} theme`} onClick={onToggle}>
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
    </button>
  );
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

/** Responsive frame: sidebar on desktop, sticky top bar and bottom tab bar on phones. */
export function AppShell({ tab, onTab, day, onNextDay, theme, onToggleTheme, children }: AppShellProps) {
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
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        <button type="button" className="btn sm ink" onClick={onNextDay}>
          {nextLabel} {!lastDay && <Icon name="arrow" />}
        </button>
      </header>

      <div className="layout">
        <aside className="side" aria-label="Menu and month progress">
          <div className="side-top">
            <Logo />
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          </div>
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
