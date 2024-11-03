from langchain_chroma import Chroma
from langchain_community.document_loaders import RecursiveUrlLoader
import requests
import boto3
from bs4 import BeautifulSoup
from langchain_text_splitters import HTMLHeaderTextSplitter
from langchain_text_splitters import RecursiveCharacterTextSplitter
import chromadb
import json
import dotenv
import os

dotenv.load_dotenv()

# Initialize the Bedrock client
client = boto3.client(
    service_name="bedrock-runtime",
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    aws_session_token=os.getenv("AWS_SESSION_TOKEN"),
    region_name = os.getenv("AWS_DEFAULT_REGION")
)
url = "https://www.conformit.com/blog/can-you-prevent-downtime-in-your-paper-mill"

# Document
def bs4_extractor(html: str) -> str:
    response = requests.get(url)
    soup = BeautifulSoup(response.content, 'html.parser')
    text = soup.get_text()
    return text.strip()

loader = RecursiveUrlLoader(url, extractor=bs4_extractor,)

docs = loader.load()

# Splitting
headers_to_split_on = [
    ("h1", "Header 1"),
    ("h2", "Header 2"),
    ("h3", "Header 3"),
    ("h4", "Header 4"),
    ("article", "Article"),
    ("div", "Bloc")
]

html_splitter = HTMLHeaderTextSplitter(headers_to_split_on)
html_header_splits = html_splitter.split_text_from_url(url)

chunk_size = 1000
chunk_overlap = 200
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=chunk_size, chunk_overlap=chunk_overlap
)
chunks = text_splitter.split_documents(html_header_splits)

# # Define a function to generate embeddings
def generate_embedding():
    body = json.dumps({
        "prompt": "\n\nHuman: What are the impacts of downtime?\n\nAssistant:",
        "max_tokens_to_sample": 300,
        "temperature": 0.1,
        "top_p": 0.9,
    })
    modelId = 'anthropic.claude-v2'
    accept = 'application/json'
    contentType = 'application/json'
    response = client.invoke_model(body=body, modelId=modelId, accept=accept, contentType=contentType)
    response_body = json.loads(response.get('body').read())
    return response_body.get('completion')

# Vector store
persistent_client = chromadb.PersistentClient()
collection = persistent_client.get_or_create_collection("HSS")
collection.add(ids=[str(i) for i in range(len(docs))], documents=docs)

vector_store_from_client = Chroma(
    client=persistent_client,
    collection_name="collection_name",
    embedding_function=generate_embedding(),
)

# tests
results = vector_store_from_client.similarity_search(
    "What are the impacts of downtime?",
)
for res in results:
    print(f"* {res.page_content} [{res.metadata}]")
