import { useEffect } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import { sessionState, useChatSession } from "@chainlit/react-client";
import { useRecoilValue, useSetRecoilState } from "recoil";
import Login from "./components/Login";
import UserManagement from "./components/UserManagement";
import { userState } from "./atoms/userAtom";
import { ChatSidebar } from "./components/sidebar/ChatSidebar";

const userEnv = {}

function App() {
  const { connect } = useChatSession();
  const session = useRecoilValue(sessionState);
  const setUser = useSetRecoilState(userState);

  useEffect(() => {
    const initializeAuth = async () => {
      if (session?.socket.connected) {
        return;
      }

      const token = localStorage.getItem("token");
      if (token) {
        try {
          const response = await fetch("http://localhost:80/user", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            connect({
              userEnv,
              accessToken: `Bearer ${token}`,
            });
          } else {
            // Token invalide, on le supprime
            localStorage.removeItem("token");
          }
        } catch (error) {
          console.error(
            "Erreur lors de la récupération des données utilisateur:",
            error
          );
        }
      }

      // Si pas de token valide, on utilise custom-auth pour Chainlit
      try {
        const res = await fetch("http://localhost:80/custom-auth");
        const data = await res.json();
        connect({
          userEnv,
          accessToken: `Bearer: ${data.token}`,
        });
      } catch (error) {
        console.error("Erreur lors de l'authentification Chainlit:", error);
      }
    };

    initializeAuth();
  }, [connect, setUser, session]);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={<UserManagement />} />
        <Route path="/chat" element={<ChatSidebar />} />
        <Route path="/" element={<Navigate to="/chat" replace />} />
      </Routes>
    </Router>
  );
}

export default App