import { Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import Result from './pages/Result'
import History from './pages/History'
import Settings from './pages/Settings'
import Generate from './pages/Generate'
import BulkScan from './pages/BulkScan'

function App() {
  return (
    <ThemeProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/result" element={<Result />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/generate" element={<Generate />} />
          <Route path="/bulk" element={<BulkScan />} />
        </Routes>
      </Layout>
    </ThemeProvider>
  )
}

export default App
