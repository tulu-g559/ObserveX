import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ActivityDetailPage } from "./pages/ActivityDetailPage";
import { DashboardPage } from "./pages/DashboardPage";
import { SearchPage } from "./pages/SearchPage";
import { SessionsPage } from "./pages/SessionsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { StatisticsPage } from "./pages/StatisticsPage";
import { TimelinePage } from "./pages/TimelinePage";

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/timeline" element={<TimelinePage />} />
        <Route path="/sessions" element={<SessionsPage />} />
        <Route path="/activity/:id" element={<ActivityDetailPage />} />
        <Route path="/statistics" element={<StatisticsPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
