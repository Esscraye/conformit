from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from starlette.middleware.cors import CORSMiddleware

from chainlit.auth import create_jwt
from chainlit.user import User
from chainlit.utils import mount_chainlit

from dotenv import load_dotenv
from datetime import timedelta

from pydantic import BaseModel, EmailStr

from auth import (
    authenticate_user,
    create_access_token,
    get_current_user,
    create_user,
    RegisterRequest,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

from cl_app import ( get_convesation_title_user, get_conversation_messages)

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*", "http://localhost:5173"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

class EmailRequest(BaseModel):
    email: EmailStr

@app.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user['email']}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@app.post("/register")
async def register(request: RegisterRequest):
    user = create_user(request.email, request.password, request.full_name)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Erreur lors de la création du compte",
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user['email']}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@app.get("/user")
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@app.get("/custom-auth")
async def custom_auth():
    # Verify the user's identity with custom logic.
    token = create_jwt(User(identifier="Test User"))
    return JSONResponse({"token": token})

# get all conversations for a user
@app.post("/conversations")
async def get_conversations(request: EmailRequest):
    conversations = get_convesation_title_user("leo.baleras@epfedu.fr")
    if not conversations:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No conversations found for this user",
        )
    return {"conversations": conversations}

@app.get("/messages/{thread_id}")
async def get_messages(thread_id: str):
    messages = get_conversation_messages(thread_id)
    if not messages:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No messages found for this thread",
        )
    return {"messages": messages}

mount_chainlit(app=app, target="cl_app.py", path="/chainlit")