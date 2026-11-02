import requests

url = "http://localhost:3000/v1/chat/completions"
headers = {
    "Authorization": "Bearer sk-foaxJtW8j2RMz8JzHOai90Uup6jGJ1mfvm444nfZ8LH1M0nN",
    "Content-Type": "application/json"
}
payload = {
    "model": "ds-web-search",
    "messages": [{"role":"user","content":"现在几点?"}],
    "tools": [{"type":"function","function":{"name":"get_time"}}]
}
res = requests.post(url, headers=headers, json=payload)
print(res.status_code)
print(res.text)
