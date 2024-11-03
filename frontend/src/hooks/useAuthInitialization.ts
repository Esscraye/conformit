import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useChatSession, sessionState } from "@chainlit/react-client";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { userState } from "../atoms/userAtom";

// const userEnv = {};

export const useAuthInitialization = () => {
  const { connect } = useChatSession();
  const session = useRecoilValue(sessionState);
  const setUser = useSetRecoilState(userState);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const initializeAuth = async () => {
      if (session?.socket.connected) {
        return;
      }

      const token = localStorage.getItem("token");
      // if (token) {
      //   try {
      //     const response = await fetch("http://localhost:80/user", {
      //       headers: {
      //         Authorization: `Bearer ${token}`,
      //       },
      //     });
      //     if (response.ok) {
      //       const userData = await response.json();
      //       setUser(userData);
      //       connect({
      //         userEnv,
      //         accessToken: `Bearer ${token}`,
      //       });
      //     } else {
      //       // Token invalide, on le supprime
      //       localStorage.removeItem("token");
      //     }
      //   } catch (error) {
      //     console.error(
      //       "Erreur lors de la récupération des données utilisateur:",
      //       error
      //     );
      //   }
      // }

      if (!token && location.pathname !== "/register") {
        if (location.pathname !== "/login") {
          navigate("/login");
        }
        return;
      }

      console.log("useAuthInitialization");


      // Si pas de token valide, on utilise custom-auth pour Chainlit
      // try {
      //   const res = await fetch("http://localhost:80/custom-auth");
      //   const data = await res.json();
      //   connect({
      //     userEnv,
      //     accessToken: `Bearer: ${data.token}`,
      //   });
      // } catch (error) {
      //   console.error("Erreur lors de l'authentification Chainlit:", error);
      // }
    };

    initializeAuth();
  }, [session?.socket.connected, location.pathname, connect, setUser, navigate]);
};