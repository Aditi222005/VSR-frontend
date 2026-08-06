import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    // Dynamic room pages — render on demand, IDs unknown at build time
    path: 'rooms/:id',
    renderMode: RenderMode.Server,
  },
  {
    // All other routes — Server-side render on request.
    // RenderMode.Prerender crashes on Node.js v23 (piscina worker incompatibility).
    // Switch to Prerender only when running on Node.js LTS (v20 / v22).
    path: '**',
    renderMode: RenderMode.Server,
  },
];

