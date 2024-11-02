import React from 'react'
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { MessageCircle } from "lucide-react"
import { useChatMessages, IStep } from "@chainlit/react-client"

export function ChatSidebar() {
  const { messages } = useChatMessages()

  const getUniqueConversations = (messages: IStep[]) => {
    const conversations = new Map()
    messages.forEach(message => {
      if (message.type === 'user_message') {
        const date = new Date(message.createdAt).toLocaleDateString()
        if (!conversations.has(date)) {
          conversations.set(date, message.output)
        }
      }
    })
    return Array.from(conversations).map(([date, title]) => ({ date, title }))
  }

  const conversations = getUniqueConversations(messages)

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <h2 className="text-lg font-semibold">Chat History</h2>
        </SidebarHeader>
        <SidebarContent>
          <ScrollArea className="h-[calc(100vh-5rem)]">
            <SidebarMenu>
              {conversations.map(({ date, title }, index) => (
                <SidebarMenuItem key={index}>
                  <SidebarMenuButton asChild>
                    <Button variant="ghost" className="w-full justify-start">
                      <MessageCircle className="mr-2 h-4 w-4" />
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{title}</span>
                        <span className="text-xs text-muted-foreground">{date}</span>
                      </div>
                    </Button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </ScrollArea>
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  );
}