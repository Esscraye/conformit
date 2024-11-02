import { useEffect } from "react"
import { sessionState, useChatSession } from "@chainlit/react-client"
import { Playground } from "./components/playground"
import { useRecoilValue } from "recoil"
import { ChatSidebar } from "./components/sidebar/Sidebar"

const userEnv = {}

function App() {
  const { connect } = useChatSession()
  const session = useRecoilValue(sessionState)
  useEffect(() => {
    if (session?.socket.connected) {
      return
    }
    fetch("http://localhost:80/custom-auth")
      .then((res) => {
        return res.json()
      })
      .then((data) => {
        connect({
          userEnv,
          accessToken: `Bearer: ${data.token}`,
        })
      })
  }, [connect])

  return (
    <div className="flex h-screen">
      <ChatSidebar />
      <div className="flex-1">
        <Playground />
      </div>
    </div>
  )
}

export default App