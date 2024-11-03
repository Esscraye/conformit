import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { v4 as uuidv4 } from "uuid";
import { useChatInteract, useChatMessages, useChatSession, IStep } from "@chainlit/react-client";
import { SidebarTrigger } from "./ui/sidebar";
import { Separator } from "./ui/separator";
import { PlusCircle, Edit3, Trash2, Save } from "lucide-react";
import { useRecoilValue } from "recoil";
import { userState } from "@/atoms/userAtom";
import ReactMarkdown from "react-markdown";
import remarkGfm from 'remark-gfm';

interface PlaygroundProps {
  initialChatId: string;
}

interface MessageLeo {
  messageId: string;
  role: string;
  content: string;
  timestamp: string;
}

const aiOptions = [
  { value: 'anthropic.claude-3-sonnet-20240229-v1:0', label: 'claude-3' },
  { value: 'meta.llama3-1-405b-instruct-v1:0', label: 'llama3.1 405b' },
  { value: 'custom-ai', label: 'Custom AI' },
];

export function Playground({ initialChatId }: PlaygroundProps) {
  const user = useRecoilValue(userState);
  const [inputValue, setInputValue] = useState("");
  const [selectedAI, setSelectedAI] = useState(aiOptions[0].value);
  const { messages } = useChatMessages();
  const { sendMessage, clear, updateChatSettings } = useChatInteract();
  const { connect } = useChatSession();
  const [savedMessages, setSavedMessages] = useState<IStep[]>([]);
  const [chatId, setChatId] = useState(initialChatId);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageContent, setEditingMessageContent] = useState<string>("");
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
        ai: selectedAI,
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

  const handleEditMessage = (messageId: string) => {
    const message = savedMessages.find((msg) => msg.id === messageId);
    if (message) {
      setEditingMessageId(messageId);
      setEditingMessageContent(message.output);
    }
  };

  const handleSaveEditMessage = async () => {
    if (editingMessageId) {
      await handleDeleteMessage(editingMessageId);
      handleSendMessage(editingMessageContent);
      setEditingMessageId(null);
      setEditingMessageContent("");
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    const response = await fetch(`http://localhost:80/messages/${chatId}/${messageId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (response.ok) {
      setSavedMessages((prev) => {
        const index = prev.findIndex((msg) => msg.id === messageId);
        if (index !== -1) {
          return prev.slice(0, index);
        }
        return prev;
      });
    }
  };

  const handleChangeModel = async (modelName: string) => {
    setSelectedAI(modelName);
    // try {
    //   const response = await fetch(`http://localhost:80/change-model`, {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify({ model_name: modelName }),
    //   });
    //   if (response.ok) {
    //     const data = await response.json();
    //     console.log(data);
    //   } else {
    //     console.error('Failed to change model');
    //   }
    // } catch (error) {
    //   console.error('Error changing model:', error);
    // }
    updateChatSettings({ ai: modelName });
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
          {editingMessageId === message.id ? (
            <div className="flex items-center space-x-2">
              <Input
                value={editingMessageContent}
                onChange={(e) => setEditingMessageContent(e.target.value)}
              />
              <Button variant="ghost" size="icon" onClick={handleSaveEditMessage}>
                <Save size={16} />
              </Button>
            </div>
          ) : (
            <>
              <ReactMarkdown remarkPlugins={[remarkGfm]} className="discussion text-black dark:text-white">{message.output}</ReactMarkdown>
              <small className="text-xs text-gray-500">{date}</small>
              {message.name !== 'Assistant' && editingMessageId !== message.id && (
                <div className="flex space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEditMessage(message.id)}>
                    <Edit3 size={16} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteMessage(message.id)}>
                    <Trash2 size={16} />
                  </Button>
                </div>
              )}
            </>
          )}
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
          <select
            value={selectedAI}
            onChange={(e) => handleChangeModel(e.target.value)}
            className="border rounded p-2"
          >
            {aiOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Input
            autoFocus
            className="flex-1"
            id="message-input"
            placeholder="Type a message"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyUp={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                handleSendMessage();
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.shiftKey) {
                e.preventDefault();
                setInputValue((prev) => prev + "\n");
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