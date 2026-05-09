import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        // ============ ROOT ============
        main: resolve(__dirname, 'index.html'),

        // ============ ADMIN DASHBOARD ============
        adminDashboard:  resolve(__dirname, 'Assets/Admin dashboard/Admin.html'),
        adminPassword:   resolve(__dirname, 'Assets/Admin dashboard/password/password.html'),
        adminPenalties:  resolve(__dirname, 'Assets/Admin dashboard/penalties/student.html'),
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
      }
    }
  }
})