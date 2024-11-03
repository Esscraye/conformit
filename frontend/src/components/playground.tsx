import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { v4 as uuidv4 } from "uuid";
import { useChatInteract, useChatMessages, useChatSession, IStep } from "@chainlit/react-client";
import { SidebarTrigger } from "./ui/sidebar";
import { Separator } from "./ui/separator";
import { PlusCircle } from "lucide-react";
import { useRecoilValue } from "recoil";
import { userState } from "@/atoms/userAtom";

interface PlaygroundProps {
  initialChatId: string;
}

interface MessageLeo {
  messageId: string;
  role: string;
  content: string;
  timestamp: string;
}

export function Playground({ initialChatId }: PlaygroundProps) {
  const user = useRecoilValue(userState);
  const [inputValue, setInputValue] = useState("");
  const { messages } = useChatMessages();
  const { sendMessage, clear } = useChatInteract();
  const { connect } = useChatSession();
  const [savedMessages, setSavedMessages] = useState<IStep[]>([]);
  const [chatId, setChatId] = useState(initialChatId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setChatId(localStorage.getItem("chatId") || initialChatId);
    console.log(initialChatId);
  }, [initialChatId]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!chatId) return;
      try {
        const response = await fetch(`http://localhost:80/messages/${chatId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        const data = await response.json();

        if (!data.messages) {
          setSavedMessages([]);
          return;
        }

        const transformedMessages = data.messages.map((message: MessageLeo) => {
          return {
            id: message.messageId,
            name: message.role,
            output: message.content,
            createdAt: message.timestamp,
          };
        });

        setSavedMessages(transformedMessages);
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    const reconnect = async () => {
      localStorage.setItem("chatId", chatId);
      clear();
      try {
        const res = await fetch("http://localhost:80/custom-auth");
        const data = await res.json();
        localStorage.setItem("token", data.token);
      } catch (error) {
        console.error("Error reconnecting:", error);
      }

      await connect({
        userEnv: {},
        accessToken: `Bearer ${localStorage.getItem("token")}`,
      });
    };

    console.log(chatId);

    if (localStorage.getItem("chatId") !== chatId) {
      reconnect();
    }

    fetchMessages();
  }, [chatId, connect, clear]);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return;
    if (!savedMessages.length) return;
    console.log(lastMessage);
    if (lastMessage.id === savedMessages[savedMessages.length - 1].id) {
      savedMessages[savedMessages.length - 1] = lastMessage;
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
      return;
    }
    if (savedMessages.filter((message) => message.output === lastMessage.output).length > 0) {
      return;
    }
    setSavedMessages((prev) => [...prev, lastMessage]);
  }, [messages]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
    console.log("kjdslkfjlkdsf")
  }, [savedMessages]);

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
        name: user?.email || "user",
        type: "user_message" as const,
        output: messageContent,
        id: chatId,
      };
      sendMessage(message, []);
      const transformedMessage: IStep = {
        id: uuidv4(),
        name: message.name,
        output: message.output,
        createdAt: new Date().toISOString(),
        type: "user_message",
      };
      setSavedMessages((prev) => [...prev, transformedMessage]);

      setInputValue("");
    }
  };

  const handleNewChat = async () => {
    const reconnect = async () => {
      const newChatId = uuidv4();
      setChatId(newChatId);
      localStorage.setItem("chatId", newChatId);
      clear();
      try {
        const res = await fetch("http://localhost:80/custom-auth");
        const data = await res.json();
        localStorage.setItem("token", data.token);
      } catch (error) {
        console.error("Error reconnecting:", error);
      }

      await connect({
        userEnv: {},
        accessToken: `Bearer ${localStorage.getItem("token")}`,
      });
    };
    console.log(chatId);
    reconnect();
  };

  const renderMessage = (message: IStep) => {
    const dateOptions: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
    };
    const date = new Date(message.createdAt).toLocaleTimeString(
      undefined,
      dateOptions
    );
    return (
      <div key={message.id} className="flex items-start space-x-2 mb-4">
        <div className="w-20 text-sm text-green-500">{message.name === 'Assistant' ? 'Assistant' : 'User'}</div>
        <div className="flex-1 border rounded-lg p-2">
          <p className="text-black dark:text-white">{message.output}</p>
          <small className="text-xs text-gray-500">{date}</small>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Button variant="ghost" className="" onClick={handleNewChat}>
            <PlusCircle className="" />
          </Button>
        </div>
      </header>
      <ScrollArea className="flex-1 p-6">
        <div className="space-y-4">
          {savedMessages.map((message) => renderMessage(message))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="grid sm:grid-cols-2 gap-2 w-full px-4 md:px-0 mx-auto md:max-w-[500px] mb-4">
        {savedMessages.length === 0 &&
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
                handleSendMessage();
              }
            }}
          />
          <Button onClick={() => handleSendMessage()} type="submit">
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}