import { createRouter, createWebHistory } from 'vue-router';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/roles' },
    { name: 'roles', path: '/roles', component: () => import('../views/RoleRoute.vue') },
    { name: 'compare', path: '/compare', component: () => import('../views/CompareRoute.vue') },
    { name: 'skills', path: '/skills', component: () => import('../views/SkillsRoute.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/roles' },
  ],
});
