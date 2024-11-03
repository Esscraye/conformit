import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import Login from "./components/Login";
import UserManagement from "./components/UserManagement";
import { ChatSidebar } from "./components/sidebar/ChatSidebar";
import Register from "./components/Register";
import { useAuthInitialization } from "./hooks/useAuthInitialization";


function AppRoutes() {

  useAuthInitialization();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/profile" element={<UserManagement />} />
      <Route path="/register" element={<Register />} />
      <Route path="/chat" element={<ChatSidebar />} />
      <Route path="/" element={<Navigate to="/chat" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;