import { Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { UpdatePrompt } from './components/UpdatePrompt';
import { InstallPrompt } from './components/InstallPrompt';
import { IosInstallHint } from './components/IosInstallHint';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { ContactsPage } from './pages/ContactsPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { WitnessPage } from './pages/WitnessPage';
import { RecapPage } from './pages/RecapPage';
import { RecapPreviewPage } from './pages/RecapPreviewPage';
import { AdminPage } from './pages/AdminPage';
import { AboutPage } from './pages/AboutPage';
import { LoginPage } from './pages/LoginPage';
import { CallbackPage } from './pages/CallbackPage';
import { NotFoundPage } from './pages/NotFoundPage';

export function App() {
  return (
    <ErrorBoundary>
      <UpdatePrompt />
      <InstallPrompt />
      <IosInstallHint />
      <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/callback" element={<CallbackPage />} />

      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/recap" element={<RecapPage />} />
        <Route path="/recap/preview" element={<RecapPreviewPage />} />
        <Route path="/witness" element={<WitnessPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/about" element={<AboutPage />} />
        {/* Catch-all: NFC landing or own profile. Param value is a camp_username. */}
        <Route path="/:campUsername" element={<ProfilePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
    </ErrorBoundary>
  );
}
