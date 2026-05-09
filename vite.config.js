import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        // ============ ROOT ============
        main: resolve(__dirname, 'index.html'),

        // ============ LANDING ============
        landing: resolve(__dirname, 'Assets/Landing/index.html'),

        // ============ STUDENT AUTH ============
        student: resolve(__dirname, 'Assets/Student Authentication/Student.html'),

        // ============ STUDENT DASHBOARD ============
        studentDashboard: resolve(__dirname, 'Assets/Student_Dashboard/student.html'),

        // ============ ADMIN AUTH ============
        adminLogin: resolve(__dirname, 'Assets/Admin Authentication/admin-login.html'),

        // ============ ADMIN DASHBOARD ============
        adminDashboard: resolve(__dirname, 'Assets/Admin dashboard/Admin.html'),
        adminSettings:  resolve(__dirname, 'Assets/Admin dashboard/settings/setting.html'),
        adminStudents:  resolve(__dirname, 'Assets/Admin dashboard/students/record.html'),
        adminPenalties: resolve(__dirname, 'Assets/Admin dashboard/penalties/student.html'),
        adminCommunityService: resolve(__dirname, 'Assets/Admin dashboard/penalties/community-service.html'),
        adminReports:   resolve(__dirname, 'Assets/Admin dashboard/Reports/reports.html'),
      }
    }
  }
})