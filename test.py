import requests

response = requests.post(
    "http://127.0.0.1:8000/api/analyze/",
    json={
        "code": "def add(a,b): return a-b",
        "language": "python"
    }
)
print("Status code:", response.status_code)
print("Response text:", response.text)
