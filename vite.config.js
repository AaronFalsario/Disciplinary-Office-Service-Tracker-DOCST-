import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        // ============ ROOT ============
        main: resolve(__dirname, 'index.html'),

        // ============ STUDENT AUTH ============
        student: resolve(__dirname, 'Assets/Student Authentication/Student.html'),

        // ============ ADMIN AUTH ============
        adminLogin: resolve(__dirname, 'Assets/Admin Authentication/admin-login.html'),

        // ============ ADMIN DASHBOARD ============
        adminDashboard: resolve(__dirname, 'Assets/Admin dashboard/Admin.html'),
        adminSettings:  resolve(__dirname, 'Assets/Admin dashboard/settings/setting.html'),
        adminStudents:  resolve(__dirname, 'Assets/Admin dashboard/students/record.html'),
        adminPenalties: resolve(__dirname, 'Assets/Admin dashboard/penalties/student.html'),
        adminReports:   resolve(__dirname, 'Assets/Admin dashboard/Reports/reports.html'),

        // ============ STUDENT DASHBOARD ============
        studentDashboard:  resolve(__dirname, 'Assets/Student_Dashboard/student.html'),
        studentPenalties:  resolve(__dirname, 'Assets/Student_Dashboard/penalties/penalties.html'),
        studentHistory:    resolve(__dirname, 'Assets/Student_Dashboard/history/history.html'),
        studentAppeal:     resolve(__dirname, 'Assets/Student_Dashboard/appeal/appeal.html'),

        // ============ COMMUNITY SERVICE ============
        communityService: resolve(__dirname, 'Assets/Admin dashboard/penalties/community-service.html'),

        // ============ LANDING PAGE ============
        landing: resolve(__dirname, 'Assets/Landing/index.html')
      }
    },
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true
  },
  server: {
    open: true,
    port: 3000
  }
})