import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Landing from './pages/Landing'
import PatientHome from './pages/PatientHome'
import ConversationSetup from './pages/ConversationSetup'
import Session from './pages/Session'
import ThankYou from './pages/ThankYou'
import Quiz from './pages/Quiz'
import PatientList from './pages/admin/PatientList'
import PatientProfile from './pages/admin/PatientProfile'
import CreatePatient from './pages/admin/CreatePatient'
import AdminLogin from './pages/admin/AdminLogin'
import AdminSignup from './pages/admin/AdminSignup'
import PatientAuth from './pages/PatientAuth'
import PatientAccess from './pages/PatientAccess'
import ProtectedPatientRoute from './components/ProtectedPatientRoute'

function App() {
  return (
    <Router>
      <AnimatePresence mode="wait">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />

          {/* Auth routes */}
          <Route path="/auth" element={<PatientAuth />} />
          <Route path="/admin/auth/login" element={<AdminLogin />} />
          <Route path="/admin/auth/signup" element={<AdminSignup />} />
          <Route path="/patient/access" element={<PatientAccess />} />

          {/* Protected Patient routes - require participant ID from URL */}
          <Route path="/patient/:participantId" element={<ProtectedPatientRoute />}>
            <Route path="home" element={<PatientHome />} />
            <Route path="conversation-setup" element={<ConversationSetup />} />
            <Route path="session" element={<Session />} />
            <Route path="thank-you" element={<ThankYou />} />
            <Route path="quiz" element={<Quiz />} />
          </Route>

          {/* Legacy routes - redirect to home for now */}
          <Route path="/home" element={<Landing />} />
          <Route path="/conversation-setup" element={<Landing />} />
          <Route path="/session" element={<Landing />} />
          <Route path="/thank-you" element={<Landing />} />
          <Route path="/quiz" element={<Landing />} />

          {/* Admin routes */}
          <Route path="/admin/patients" element={<PatientList />} />
          <Route path="/admin/patients/new" element={<CreatePatient />} />
          <Route path="/admin/patients/:id" element={<PatientProfile />} />
          <Route
            path="/admin/analytics"
            element={
              <div className="flex h-screen bg-gray-50">
                <div className="flex-1 flex items-center justify-center">
                  <h1 className="text-3xl text-gray-700">Analytics dashboard - Phase 11</h1>
                </div>
              </div>
            }
          />
        </Routes>
      </AnimatePresence>
    </Router>
  )
}

export default App
