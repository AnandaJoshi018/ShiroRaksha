import requests

url = "http://localhost:8000/predict"
files = {"file": open("D:/major project stuff/tampered img/objectremoval img/sample_1_original.png", "rb")}
res = requests.post(url, files=files)
print(res.json())
