import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { RoleSwitchProvider } from "./contexts/RoleSwitchContext";
import AppLayout from "./components/layout/AppLayout";
import AuthGuard from "./components/guards/AuthGuard";
import ScrollToTop from "./components/common/ScrollToTop";
import RoleSwitchTransition from "./components/common/RoleSwitchTransition";
import DesktopNotice from "./components/common/DesktopNotice";
import { isMobileDevice } from "./utils/deviceDetection";

// User Pages
import Home from "./pages/Home";
import MyGames from "./pages/MyGames";
import MyTournamentMatches from "./pages/MyTournamentMatches";
import EventDetail from "./pages/EventDetail";
import CategoryDetail from "./pages/CategoryDetail";
import MatchDetail from "./pages/MatchDetail";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import Notifications from "./pages/Notifications";

// Organizer Pages
import CreateTournament from "./pages/organizer/CreateTournament";
import EditTournament from "./pages/organizer/EditTournament";
import TournamentDashboard from "./pages/organizer/TournamentDashboard";

// Scorer Pages
import TournamentMatches from "./pages/scorer/TournamentMatches";
import ScorerCategoryDetail from "./pages/scorer/ScorerCategoryDetail";
import ScoringConsole from "./pages/scorer/ScoringConsole";

// Admin Pages
import InitSports from "./pages/admin/InitSports";
import AddFormats from "./pages/admin/AddFormats";


function App() {
  // 檢測是否為移動裝置
  const isMobile = isMobileDevice();

  // 如果不是移動裝置，顯示提示頁面
  if (!isMobile) {
    return <DesktopNotice />;
  }

  return (
    <Router>
      <ScrollToTop />
      <AuthProvider>
        <RoleSwitchProvider>
          <RoleSwitchTransition />
          <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />

          {/* User Routes with Layout */}
          <Route element={<AppLayout />}>
            <Route path="/" element={<Home />} />
            <Route 
              path="/my-games" 
              element={
                <AuthGuard>
                  <MyGames />
                </AuthGuard>
              } 
            />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

          {/* User Detail Routes without Layout (full screen with own navigation) */}
          <Route path="/events/:id" element={<EventDetail />} />
          <Route
            path="/events/:id/categories/:categoryId"
            element={<CategoryDetail />}
          />
          <Route path="/matches/:id" element={<MatchDetail />} />
          <Route
            path="/my-games/tournament/:tournamentId"
            element={<MyTournamentMatches />}
          />

          {/* Organizer Routes without Layout (full screen) */}
          {/* Redirect /organizer to /my-games */}
          <Route path="/organizer" element={<Navigate to="/my-games" replace />} />
          <Route
            path="/organizer/create"
            element={
              <AuthGuard>
                <CreateTournament />
              </AuthGuard>
            }
          />
          <Route
            path="/organizer/tournaments/:id/edit"
            element={
              <AuthGuard>
                <EditTournament />
              </AuthGuard>
            }
          />
          <Route
            path="/organizer/tournaments/:id"
            element={
              <AuthGuard>
                <TournamentDashboard />
              </AuthGuard>
            }
          />

          {/* Scorer Routes without Layout (full screen) */}
          {/* Redirect /scorer to /my-games */}
          <Route path="/scorer" element={<Navigate to="/my-games" replace />} />
          <Route
            path="/scorer/tournaments/:id"
            element={
              <AuthGuard>
                <TournamentMatches />
              </AuthGuard>
            }
          />
          <Route
            path="/scorer/tournaments/:id/categories/:categoryId"
            element={
              <AuthGuard>
                <ScorerCategoryDetail />
              </AuthGuard>
            }
          />
          <Route
            path="/scorer/matches/:id"
            element={
              <AuthGuard>
                <ScoringConsole />
              </AuthGuard>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin/init-sports"
            element={
              <AuthGuard>
                <InitSports />
              </AuthGuard>
            }
          />
          <Route
            path="/admin/add-formats"
            element={
              <AuthGuard>
                <AddFormats />
              </AuthGuard>
            }
          />
          
        </Routes>
        </RoleSwitchProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
