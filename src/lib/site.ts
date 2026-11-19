import config from '../../config/site.json';

export const SITE = {
  ...config,
  siteUrl: (import.meta.env.VITE_SITE_URL || config.siteUrl).replace(/\/$/, ''),
  refreshEndpoint: import.meta.env.VITE_REFRESH_ENDPOINT || config.refresh.endpoint,
};

/** Vite base path, always with leading and trailing slash (e.g. "/steel/"). */
export const BASE = import.meta.env.BASE_URL;

export const dataUrl = (p: string) => `${BASE}data/${p}`;

/** Absolute public URL for an in-app route path such as "/article/x". */
export const absoluteUrl = (routePath: string) => `${SITE.siteUrl}${routePath === '/' ? '/' : routePath.replace(/\/?$/, '/')}`;

export const shareImageUrl = (kind: 'article' | 'edition', id: string) => `${SITE.siteUrl}/share/${kind}/${id}.png`;

export const githubRepoUrl = `https://github.com/${config.github.owner}/${config.github.repo}`;
export const workflowUrl = (file: string) => `${githubRepoUrl}/actions/workflows/${file}`;
