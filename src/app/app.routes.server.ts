import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
<<<<<<< HEAD
    path: 'inscrire/bloomer',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'inscrire/coach',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'inscrire/nutritionist',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'authentification/:role',
    renderMode: RenderMode.Server
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
=======
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
>>>>>>> 7d51e85d931d9be534ee41817055b31af3683d78
