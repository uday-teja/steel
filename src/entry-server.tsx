import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { App } from './App';
import { installSsrLoader } from './lib/data';

/** Render one route to HTML. Returns the markup and every data file it used. */
export function render(url: string, loader: (path: string) => unknown): { html: string; data: Record<string, unknown> } {
  const used = installSsrLoader(loader);
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';
  const html = renderToString(
    <StrictMode>
      <StaticRouter location={basename === "/" ? url : `${basename}${url}`} basename={basename} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </StaticRouter>
    </StrictMode>,
  );
  return { html, data: Object.fromEntries(used) };
}
