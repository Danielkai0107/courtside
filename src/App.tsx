import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { RoleSwitchProvider } from "./contexts/RoleSwitchContext";
import AppLayout from "./components/layout/AppLayout";
import AuthGuard from "./components/guards/AuthGuard";
import RoleGuard from "./components/guards/RoleGuard";
import ScrollToTop from "./components/common/ScrollToTop";
import RoleSwitchTransition from "./components/common/RoleSwitchTransition";

// User Pages
import Home from "./pages/Home";
import MyGames from "./pages/MyGames";
import MyTournamentMatches from "./pages/MyTournamentMatches";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import CategoryDetail from "./pages/CategoryDetail";
import MatchDetail from "./pages/MatchDetail";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import Notifications from "./pages/Notifications";

// Organizer Pages
import OrganizerHome from "./pages/organizer/OrganizerHome";
import CreateTournament from "./pages/organizer/CreateTournament";
import EditTournament from "./pages/organizer/EditTournament";
import TournamentDashboard from "./pages/organizer/TournamentDashboard";

// Scorer Pages
import ScorerHome from "./pages/scorer/ScorerHome";
import TournamentMatches from "./pages/scorer/TournamentMatches";
import ScorerCategoryDetail from "./pages/scorer/ScorerCategoryDetail";
import ScoringConsole from "./pages/scorer/ScoringConsole";

// Admin Pages
import InitSports from "./pages/admin/InitSports";

function App() {
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
            <Route path="/events" element={<Events />} />
            <Route path="/my-games" element={<MyGames />} />
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

          {/* Organizer Routes with Layout */}
          <Route element={<AppLayout />}>
            <Route
              path="/organizer"
              element={
                <AuthGuard>
                  <RoleGuard requiredRole="organizer">
                    <OrganizerHome />
                  </RoleGuard>
                </AuthGuard>
              }
            />
          </Route>

          {/* Organizer Routes without Layout (full screen) */}
          <Route
            path="/organizer/create"
            element={
              <AuthGuard>
                <RoleGuard requiredRole="organizer">
                  <CreateTournament />
                </RoleGuard>
              </AuthGuard>
            }
          />
          <Route
            path="/organizer/tournaments/:id/edit"
            element={
              <AuthGuard>
                <RoleGuard requiredRole="organizer">
                  <EditTournament />
                </RoleGuard>
              </AuthGuard>
            }
          />
          <Route
            path="/organizer/tournaments/:id"
            element={
              <AuthGuard>
                <RoleGuard requiredRole="organizer">
                  <TournamentDashboard />
                </RoleGuard>
              </AuthGuard>
            }
          />

          {/* Scorer Routes with Layout */}
          <Route element={<AppLayout />}>
            <Route
              path="/scorer"
              element={
                <AuthGuard>
                  <RoleGuard requiredRole="scorer">
                    <ScorerHome />
                  </RoleGuard>
                </AuthGuard>
              }
            />
          </Route>

          {/* Scorer Routes without Layout (full screen) */}
          <Route
            path="/scorer/tournaments/:id"
            element={
              <AuthGuard>
                <RoleGuard requiredRole="scorer">
                  <TournamentMatches />
                </RoleGuard>
              </AuthGuard>
            }
          />
          <Route
            path="/scorer/tournaments/:id/categories/:categoryId"
            element={
              <AuthGuard>
                <RoleGuard requiredRole="scorer">
                  <ScorerCategoryDetail />
                </RoleGuard>
              </AuthGuard>
            }
          />
          <Route
            path="/scorer/matches/:id"
            element={
              <AuthGuard>
                <RoleGuard requiredRole="scorer">
                  <ScoringConsole />
                </RoleGuard>
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
        </Routes>
        </RoleSwitchProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
