import { Route, Routes } from 'react-router-dom'
import Start from './pages/Start'
import Group from './pages/Group'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Start />} />
      <Route path="/g/:slug" element={<Group />} />
      <Route path="*" element={<Start />} />
    </Routes>
  )
}
