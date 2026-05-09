import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        // ============ ROOT ============
        main: resolve(__dirname, 'index.html'),

        // ============ LANDING PAGE ============
        landing: resolve(__dirname, 'Assets/Landing/index.html'),

        // ============ ADMIN DASHBOARD ============
        adminDashboard:  resolve(__dirname, 'Assets/Admin dashboard/Admin.html'),
        adminPassword:   resolve(__dirname, 'Assets/Admin dashboard/password/password.html'),
        adminPenalties:  resolve(__dirname, 'Assets/Admin dashboard/penalties/student.html'),
        adminReports:    resolve(__dirname, 'Assets/Admin dashboard/report/report.html'),
        adminSettings:   resolve(__dirname, 'Assets/Admin dashboard/settings/setting.html'),
        adminStudents:   resolve(__dirname, 'Assets/Admin dashboard/students/record.html'),

        // ============ STUDENT AUTH ============
        studentAuth:     resolve(__dirname, 'Assets/Student Authentication/Student.html'),

        // ============ ADMIN AUTH (inside Student Authentication folder) ============
        adminLogin:      resolve(__dirname, 'Assets/Student Authentication/Admin Authentication/Admin.html'),
        adminUpdatePass: resolve(__dirname, 'Assets/Student Authentication/Admin Authentication/update-password.html'),

        // ============ STUDENT DASHBOARD ============
        studentDashboard: resolve(__dirname, 'Assets/Student_Dashboard/stud.html'),
        studentAppeal:    resolve(__dirname, 'Assets/Student_Dashboard/appeal/appeal.html'),
        studentHistory:   resolve(__dirname, 'Assets/Student_Dashboard/history/history.html'),
        studentPenalties: resolve(__dirname, 'Assets/Student_Dashboard/penalties/penalties.html'),
        studentSettings:  resolve(__dirname, 'Assets/Student_Dashboard/settings/setting.html'),

        // ============ JS MODULES ============
        drawerAdmin:     resolve(__dirname, 'Assets/drawer-admin.js'),
        adminNav:        resolve(__dirname, 'Assets/admin-nav.js'),

        // ============ CSS FILES ============
        styleMain:       resolve(__dirname, 'Assets/Admin dashboard/style.css'),
        styleDrawer:     resolve(__dirname, 'Assets/css/styles-drawer.css'),
        styleSettings:   resolve(__dirname, 'Assets/Admin dashboard/settings/setting.css'),
        stylePenalties:  resolve(__dirname, 'Assets/Admin dashboard/penalties/stud.css'),
        styleReports:    resolve(__dirname, 'Assets/Admin dashboard/report/report.css'),
      }
    }
  },
  server: {
    port: 5173,
    open: true,
    host: true
  },
  preview: {
    port: 5173,
    open: true
  }
})