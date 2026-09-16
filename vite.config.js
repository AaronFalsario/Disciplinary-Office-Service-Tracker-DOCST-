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

        adminDashboard: resolve(__dirname, 'Assets/Admin_dashboard/adminDashboard.html'),
        adminPassword: resolve(__dirname, 'Assets/Admin_dashboard/password/password.html'),

        studentAuth: resolve(__dirname, 'Assets/Student_Authentication/Student.html'),

        adminLogin: resolve(__dirname, 'Assets/Student_Authentication/Admin_Authentication/Admin.html'),
        adminUpdatePass: resolve(__dirname, 'Assets/Student_Authentication/Admin_Authentication/update-password.html'),

        studentDashboard: resolve(__dirname, 'Assets/Student_Dashboard/studentDashboard.html'),
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