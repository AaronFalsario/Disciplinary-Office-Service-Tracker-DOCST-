import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),

        adminDashboard: resolve(__dirname, 'Assets/Admin_dashboard/Admin.html'),
        adminPassword: resolve(__dirname, 'Assets/Admin_dashboard/password/password.html'),
        adminPenalties: resolve(__dirname, 'Assets/Admin_dashboard/penalties/student.html'),
        adminReports: resolve(__dirname, 'Assets/Admin_dashboard/report/report.html'),
        adminSettings: resolve(__dirname, 'Assets/Admin_dashboard/settings/setting.html'),
        adminStudents: resolve(__dirname, 'Assets/Admin_dashboard/students/record.html'),
        adminAppeals: resolve(__dirname, 'Assets/Admin_dashboard/appeal/appeal.html'),

        studentAuth: resolve(__dirname, 'Assets/Student_Authentication/Student.html'),

        adminLogin: resolve(__dirname, 'Assets/Student_Authentication/Admin_Authentication/Admin.html'),
        adminUpdatePass: resolve(__dirname, 'Assets/Student_Authentication/Admin_Authentication/update-password.html'),

        studentDashboard: resolve(__dirname, 'Assets/Student_Dashboard/stud.html'),
        studentAppeal: resolve(__dirname, 'Assets/Student_Dashboard/appeal/appeal.html'),
        studentHistory: resolve(__dirname, 'Assets/Student_Dashboard/history/history.html'),
        studentPenalties: resolve(__dirname, 'Assets/Student_Dashboard/penalties/penalties.html'),
        studentSettings: resolve(__dirname, 'Assets/Student_Dashboard/settings/setting.html'),
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