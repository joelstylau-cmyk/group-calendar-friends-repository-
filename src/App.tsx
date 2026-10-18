import { Route, Routes } from 'react-router-dom'
import AccountBar from './components/AccountBar'
import { AuthGate } from './lib/auth'
import Group from './pages/Group'
import Login from './pages/Login'
import Start from './pages/Start'

export default function App() {
  return (
    <AuthGate login={<Login />}>
      <AccountBar />
      <Routes>
        <Route path="/" element={<Start />} />
        <Route path="/g/:slug" element={<Group />} />
        <Route path="*" element={<Start />} />
      </Routes>
    </AuthGate>
  )
}
