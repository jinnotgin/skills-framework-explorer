import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router';

const history =
  import.meta.env.APP_ROUTER_MODE === 'hash'
    ? createWebHashHistory(import.meta.env.BASE_URL)
    : createWebHistory(import.meta.env.BASE_URL);

export const router = createRouter({
  history,
  routes: [
    { path: '/', redirect: '/roles' },
    { name: 'roles', path: '/roles', component: () => import('../views/RoleRoute.vue') },
    { name: 'compare', path: '/compare', component: () => import('../views/CompareRoute.vue') },
    { name: 'skills', path: '/skills', component: () => import('../views/SkillsRoute.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/roles' },
  ],
});
