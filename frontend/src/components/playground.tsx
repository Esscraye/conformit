import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { v4 as uuidv4 } from "uuid";

import {
  useChatInteract,
  useChatMessages,
  IStep,
} from "@chainlit/react-client";
import { useState } from "react";

export function Playground() {
  const [inputValue, setInputValue] = useState("")
  const { sendMessage } = useChatInteract()
  const { messages } = useChatMessages()

  const suggestedActions = [
    { title: "View all", label: "my cameras", action: "View all my cameras" },
    { title: "Show me", label: "my smart home hub", action: "Show me my smart home hub" },
    {
      title: "How much",
      label: "electricity have I used this month?",
      action: "Show electricity usage",
    },
    {
      title: "How much",
      label: "water have I used this month?",
      action: "Show water usage",
    },
  ];

  const handleSendMessage = (content?: string) => {
    const messageContent = content ? content.trim() : inputValue.trim();
    if (messageContent) {
      const message = {
        name: "user",
        type: "user_message" as const,
        output: messageContent,
      };
      sendMessage(message, []);
      setInputValue("");
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

      <div className="grid sm:grid-cols-2 gap-2 w-full px-4 md:px-0 mx-auto md:max-w-[500px] mb-4">
        {messages.length === 0 &&
          suggestedActions.map((action, index) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.01 * index }}
              key={index}
              className={index > 1 ? "hidden sm:block" : "block"}
            >
              <button
                onClick={() => handleSendMessage(action.action)}
                className="w-full text-left border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-300 rounded-lg p-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex flex-col"
              >
                <span className="font-medium">{action.title}</span>
                <span className="text-zinc-500 dark:text-zinc-400">
                  {action.label}
                </span>
              </button>
            </motion.div>
          ))}
      </div>

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
          <Button onClick={() => handleSendMessage()} type="submit">
            Send
          </Button>
        </div>
      </div>
    </div>
  )
}