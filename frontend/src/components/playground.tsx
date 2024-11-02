import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useChatInteract, useChatMessages, IStep } from "@chainlit/react-client"
import { useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"

export function Playground() {
  const [inputValue, setInputValue] = useState("")
  const { sendMessage } = useChatInteract()
  const { messages } = useChatMessages()

  const handleSendMessage = () => {
    const content = inputValue.trim()
    if (content) {
      const message = {
        name: "user",
        type: "user_message" as const,
        output: content,
      }
      sendMessage(message, [])
      setInputValue("")
    }
  }

  const renderMessage = (message: IStep) => {
    const dateOptions: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
    }
    const date = new Date(message.createdAt).toLocaleTimeString(
      undefined,
      dateOptions
    )
    return (
      <div key={message.id} className="flex items-start space-x-2 mb-4">
        <div className="w-20 text-sm text-green-500">{message.name}</div>
        <div className="flex-1 border rounded-lg p-2">
          <p className="text-black dark:text-white">{message.output}</p>
          <small className="text-xs text-gray-500">{date}</small>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      <ScrollArea className="flex-1 p-6">
        <div className="space-y-4">
          {messages.map((message) => renderMessage(message))}
        </div>
      </ScrollArea>
      <div className="border-t p-4 bg-white dark:bg-gray-800">
        <div className="flex items-center space-x-2">
          <Input
            autoFocus
            className="flex-1"
            id="message-input"
            placeholder="Type a message"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyUp={(e) => {
              if (e.key === "Enter") {
                handleSendMessage()
              }
            }}
          />
          <Button onClick={handleSendMessage} type="submit">
            Send
          </Button>
        </div>
      </div>
    </div>
  )
}