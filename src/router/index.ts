import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router';
import type { RouteLocationRaw } from 'vue-router';

type RouteModuleLoader = () => Promise<unknown>;

const loadRoleRoute: RouteModuleLoader = () => import('../views/RoleRoute.vue');
const loadCompareRoute: RouteModuleLoader = () => import('../views/CompareRoute.vue');
const loadSkillsRoute: RouteModuleLoader = () => import('../views/SkillsRoute.vue');

const loadedRouteModules = new WeakSet<RouteModuleLoader>();
const pendingRouteModules = new WeakMap<RouteModuleLoader, Promise<unknown>>();

const history =
  import.meta.env.APP_ROUTER_MODE === 'hash'
    ? createWebHashHistory(import.meta.env.BASE_URL)
    : createWebHistory(import.meta.env.BASE_URL);

export const router = createRouter({
  history,
  routes: [
    { path: '/', redirect: '/roles' },
    { name: 'roles', path: '/roles', component: loadRoleRoute, meta: { prefetch: loadRoleRoute } },
    { name: 'compare', path: '/compare', component: loadCompareRoute, meta: { prefetch: loadCompareRoute } },
    { name: 'skills', path: '/skills', component: loadSkillsRoute, meta: { prefetch: loadSkillsRoute } },
    { path: '/:pathMatch(.*)*', redirect: '/roles' },
  ],
});

export function prefetchRouteComponents(to: RouteLocationRaw) {
  const tasks = router.resolve(to).matched.flatMap((record) => {
    const prefetch = record.meta.prefetch as RouteModuleLoader | RouteModuleLoader[] | undefined;
    const loaders = Array.isArray(prefetch) ? prefetch : prefetch ? [prefetch] : [];

    return loaders.map((loader) => {
      if (loadedRouteModules.has(loader)) {
        return null;
      }

      const pendingTask = pendingRouteModules.get(loader);
      if (pendingTask) {
        return pendingTask;
      }

      const task = loader()
        .then((module) => {
          loadedRouteModules.add(loader);
          return module;
        })
        .finally(() => {
          pendingRouteModules.delete(loader);
        });

      pendingRouteModules.set(loader, task);
      return task;
    });
  });

  return Promise.allSettled(tasks.filter((task): task is Promise<unknown> => Boolean(task)));
}
