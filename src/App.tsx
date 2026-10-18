import { Route, Routes } from 'react-router-dom'
import AccountBar from './components/AccountBar'
import { AuthGate } from './lib/auth'
import { ProfileProvider } from './lib/profile'
import Group from './pages/Group'
import Login from './pages/Login'
import Settings from './pages/Settings'
import Start from './pages/Start'

export default function App() {
  return (
    <AuthGate login={<Login />}>
      <ProfileProvider>
        <AccountBar />
        <Routes>
          <Route path="/" element={<Start />} />
          <Route path="/g/:slug" element={<Group />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Start />} />
        </Routes>
      </ProfileProvider>
    </AuthGate>
  )
}
