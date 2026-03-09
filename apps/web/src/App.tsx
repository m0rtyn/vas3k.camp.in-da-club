import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { ContactsPage } from './pages/ContactsPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { WitnessPage } from './pages/WitnessPage';
import { AdminPage } from './pages/AdminPage';
import { LoginPage } from './pages/LoginPage';
import { CallbackPage } from './pages/CallbackPage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/callback" element={<CallbackPage />} />

      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/witness" element={<WitnessPage />} />
        <Route path="/admin" element={<AdminPage />} />
        {/* Catch-all: NFC landing or own profile */}
        <Route path="/:username" element={<ProfilePage />} />
      </Route>
    </Routes>
  );
}
