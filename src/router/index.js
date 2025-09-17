// Minimal router for auth + profile + dashboard
import { createWebHashHistory, createRouter } from 'vue-router'
import { authGuard } from './routeGuard'

const routes = [
  { path: '/', name: 'root', redirect: { name: 'dashboard' } },
  { meta: { title: 'Login', public: true }, path: '/login', name: 'login', component: () => import('@/auth/SigninPage.vue') },
  { meta: { title: 'Register', public: true }, path: '/register', name: 'register', component: () => import('@/auth/RegisterPage.vue') },
  { meta: { title: 'Verify Email', public: true }, path: '/verify-email', name: 'verify-email', component: () => import('@/auth/VerifyPage.vue') },
  { meta: { title: 'Verifying', public: true }, path: '/verifying-now', name: 'verifying-now', component: () => import('@/auth/VerifyingNow.vue') },

  { meta: { title: 'Dashboard', requiresAuth: true }, path: '/dashboard', name: 'dashboard', component: () => import('@/views/IndexPage.vue') },
  { meta: { title: 'Profile', requiresAuth: true }, path: '/profile/:id?', name: 'profile', component: () => import('@/views/ProfilePage.vue'), props: true },
  { meta: { title: 'User Management', requiresAuth: true }, path: '/user-mgt', name: 'user-management', component: () => import('@/views/UserManagementPage.vue') },
  { meta: { title: 'Department Management', requiresAuth: true }, path: '/department-mgt', name: 'department-management', component: () => import('@/views/DepartmentManagementPage.vue') },
  { meta: { title: 'Standards Management', requiresAuth: true }, path: '/standards', name: 'standards-management', component: () => import('@/views/StandardsManagementPage.vue') },
  { meta: { title: 'Evaluations', requiresAuth: true }, path: '/evaluations', name: 'evaluations-management', component: () => import('@/views/EvaluationsManagementPage.vue') },
  { meta: { title: 'Compliance', requiresAuth: true }, path: '/compliance/:departmentId?', name: 'compliance', component: () => import('@/views/CompliancePage.vue'), props: true },
  { meta: { title: 'Session Logs', requiresAuth: true }, path: '/session-logs', name: 'session-logs', component: () => import('@/views/SessionLogsPage.vue') },
  { meta: { title: 'Department', requiresAuth: true }, path: '/departments/:id', name: 'department-view', component: () => import('@/views/DepartmentView.vue'), props: true },
  { meta: { title: 'Access Restricted', requiresAuth: true }, path: '/restricted', name: 'access-restricted', component: () => import('@/views/AccessRestricted.vue') },

  { path: '/:pathMatch(.*)*', name: 'NotFound', component: () => import('@/views/ErrorPage.vue') },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior(to, from, saved) { return saved || { top: 0 } }
})

router.beforeEach(authGuard)

export default router
