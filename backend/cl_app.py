import chainlit.data as cl_data
from chainlit.data.dynamodb import DynamoDBDataLayer
from chainlit.data.storage_clients import S3StorageClient
from langchain_aws import ChatBedrockConverse
from langchain.prompts import ChatPromptTemplate
from langchain.schema import StrOutputParser
from langchain.schema.runnable import Runnable
from langchain.schema.runnable.config import RunnableConfig
from typing import cast
import chainlit as cl
from dotenv import load_dotenv
import boto3
from datetime import datetime
import uuid
import json
import sys

load_dotenv()

# Initialiser le client DynamoDB
dynamodb = boto3.resource('dynamodb', region_name='us-west-2')
table = dynamodb.Table('ChatsTable')

def save_message(conversation_id, content, role):
    message_id = str(uuid.uuid4())
    created_at = datetime.utcnow().isoformat()

    message = {
        'messageId': message_id,
        'role': 'Assistant' if role == 'Assistant' else 'User',
        'content': content,
        'timestamp': created_at
    }

    response = table.get_item(Key={'chatId': conversation_id})
    item = response.get('Item')

    if not item:
        new_item = {
            'chatId': conversation_id,
            'messages': [message],
            'title': content,
            'userEmail': role,
            'createdAt': created_at
        }
        table.put_item(Item=new_item)
        return

    # Ajouter le nouveau message à la liste des messages
    messages = item.get('messages', [])
    messages.append(message)

    # Mettre à jour l'élément dans DynamoDB
    table.update_item(
        Key={'chatId': conversation_id},
        UpdateExpression="SET messages = :messages",
        ExpressionAttributeValues={
            ':messages': messages
        }
    )

def get_convesation_title_user(user_email):
    response = table.scan()
    items = response.get('Items', [])

    items = [item for item in items if item['userEmail'] == user_email]

    # get all chatid ant title in a list
    data = []
    for item in items:
        data.append({'chatId': item['chatId'], 'title': item['title'], 'createdAt': item['createdAt']})

    # Sort the data by createdAt in descending order
    data.sort(key=lambda x: x['createdAt'], reverse=True)

    return data

def get_conversation_messages(chat_id):
    response = table.get_item(Key={'chatId': chat_id})
    item = response.get('Item', {})

    messages = item.get('messages', [])

    return messages 

async def delete_message_from_db(chat_id, message_id):
    # Récupérer les messages du chat spécifié
    response = table.get_item(Key={'chatId': chat_id})
    if 'Item' not in response:
        return None

    messages = response['Item']['messages']

    # Trouver l'index du message à supprimer
    message_index = next((index for (index, d) in enumerate(messages) if d["messageId"] == message_id), None)

    if message_index is not None:
        # Supprimer tous les messages à partir de cet index
        messages = messages[:message_index]

        # Mettre à jour la table avec la nouvelle liste de messages
        table.update_item(
            Key={'chatId': chat_id},
            UpdateExpression="SET messages = :messages",
            ExpressionAttributeValues={
                ':messages': messages
            }
        )
        return True

    return None

@cl.on_chat_start
async def on_chat_start():
    llm = ChatBedrockConverse(
        model="anthropic.claude-3-sonnet-20240229-v1:0",
        region_name="us-west-2",
        temperature=0,
        max_tokens=None
    )
    system_message = (
        "Tu es un expert en création de formations sur tous les sujets. "
        "Rédige les formations en Markdown. "
        "N'hésite pas à ajouter des emojis pour rendre le contenu plus engageant "
    )
    preprompt = (
        "Avant de commencer, voici quelques conseils pour structurer une formation efficace :\n"
        "1. **Introduction** : Commence par une brève introduction du sujet.\n"
        "2. **Objectifs** : Énonce clairement les objectifs d'apprentissage.\n"
        "3. **Contenu** : Divise le contenu en sections logiques avec des titres de niveau 2.\n"
        "4. **Exemples** : Utilise des exemples concrets pour illustrer les points clés.\n"
        "5. **Résumé** : Termine par un résumé des points importants.\n"
        "6. **Quiz** : Ajoute un quiz à la fin pour tester les connaissances acquises.\n"
        "7. **Ressources** : Fournis des ressources supplémentaires pour approfondir le sujet.\n"
        "8. **Interactivité** : Utilise des questions ouvertes et des activités interactives pour engager les apprenants.\n"
        "9. **Feedback** : Encourage les apprenants à donner leur feedback pour améliorer la formation.\n"
        "10. **Conclusion** : Conclus avec une note positive et encourageante."
    )
    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", system_message),
            ("system", preprompt),
            ("human", "{question}"),
        ]
    )
    runnable = prompt | llm | StrOutputParser()
    cl.user_session.set("runnable", runnable)

    # await cl.Message(content="Connected to Chainlit!").send()

@cl.on_message
async def on_message(message: cl.Message):
    runnable = cast(Runnable, cl.user_session.get("runnable"))  # type: Runnable

    msg = cl.Message(content="")
    conversationId = message.to_dict()['id']

    async for chunk in runnable.astream(
        {"question": message.content},
        config=RunnableConfig(callbacks=[cl.LangchainCallbackHandler()]),
    ):
        await msg.stream_token(chunk)

    await msg.send()

    # # Save the message to DynamoDB
    user_email = message.to_dict()['name']
    save_message(conversationId, message.content, user_email)
    save_message(conversationId, msg.content, 'Assistant')


@cl.on_chat_end
async def on_chat_end():
    # Save the chat history to DynamoDB
    chat_history = cl.user_session.get("chat_history")
    thread_id = cl.user_session.get("thread_id")
    if chat_history and thread_id:
        chat_history = json.dumps(chat_history)
        cl_data.save(thread_id, chat_history)

        # Clear the chat history from the session
        cl.user_session.set("chat_history", [])
        await cl.Message(content="Chat history saved to DynamoDB").send()
    else:
        await cl.Message(content="No chat history to save").send()

@cl.on_settings_update
async def change_model(data):
    print(data["ai"])
    model_name = data["ai"]
    user_session = cl.user_session.get("runnable")
    if not user_session:
        return {"detail": "Chainlit user session not found"}
    
    llm = ChatBedrockConverse(
        model=model_name,
        region_name="us-west-2",
        temperature=0,
        max_tokens=None
    )
    system_message = (
        "Commence ta réponse par Bravo ! Tu as changé de modèle de langage."
    )
    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", system_message),
            ("human", "{question}"),
        ]
    )
    runnable = prompt | llm | StrOutputParser()
    cl.user_session.set("runnable", runnable)