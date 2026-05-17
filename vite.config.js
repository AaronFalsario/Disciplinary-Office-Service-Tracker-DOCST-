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
        
        // Use glob patterns to find all HTML files
        ...Object.fromEntries(
          Object.entries({
            adminDashboard: 'Assets/Admin dashboard/Admin.html',
            adminStudents: 'Assets/Admin dashboard/students/record.html',
            adminAppeals: 'Assets/Admin dashboard/appeal/appeal.html',
            adminPenalties: 'Assets/Admin dashboard/penalties/student.html',
            adminReports: 'Assets/Admin dashboard/report/report.html',
            adminSettings: 'Assets/Admin dashboard/settings/setting.html',
            studentAuth: 'Assets/Student Authentication/Student.html',
          }).map(([key, value]) => [key, resolve(__dirname, value)])
        )
      }
    }
  }
})