import { AppProvider, useApp } from './context/AppContext'
import Header from './components/Header'
import SettingsPanel from './components/SettingsPanel'
import UploadPage from './pages/UploadPage'
import ProcessingPage from './pages/ProcessingPage'
import ReviewPage from './pages/ReviewPage'

function AppContent() {
  const { currentPage } = useApp()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-1">
        {currentPage === 'upload' && <UploadPage />}
        {currentPage === 'processing' && <ProcessingPage />}
        {currentPage === 'review' && <ReviewPage />}
      </main>
      <SettingsPanel />
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}
