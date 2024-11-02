import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useRecoilValue, useResetRecoilState } from 'recoil'
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { userState } from '../atoms/userAtom'
import { useChatSession } from "@chainlit/react-client"

export default function UserManagement() {
  const user = useRecoilValue(userState)
  const resetUser = useResetRecoilState(userState)
  const navigate = useNavigate()
  const { disconnect } = useChatSession()

  const logout = () => {
    localStorage.removeItem('token')
    resetUser()
    disconnect()
    navigate('/login')
  }

  if (!user) {
    return <div>Chargement...</div>
  }

  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Profil Utilisateur</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <Avatar className="w-24 h-24">
          <AvatarImage src={user.avatar || ''} alt="Avatar" />
          <AvatarFallback>{user.name?.charAt(0) || 'U'}</AvatarFallback>
        </Avatar>
        <h2 className="mt-4 text-xl font-bold">{user.name}</h2>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => navigate('/chat')}>
          Retour au chat
        </Button>
        <Button variant="destructive" onClick={logout}>
          Déconnexion
        </Button>
      </CardFooter>
    </Card>
  )
}