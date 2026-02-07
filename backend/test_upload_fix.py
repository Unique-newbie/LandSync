import requests
import json
import os

# Configuration
API_URL = "http://localhost:8000/api/v1/upload/spatial"
FILE_PATH = "sample_test.geojson"
VILLAGE_ID = "00000000-0000-0000-0000-000000000000"  # We might need a valid village ID, but let's see if we can query one first or if the backend handles invalid IDs gracefully (or if we need to create one)

def get_village_id():
    # Try to fetch villages to get a valid ID
    try:
        response = requests.get("http://localhost:8000/api/v1/villages")
        if response.status_code == 200:
            villages = response.json()
            if villages:
                return villages[0]['id']
    except Exception as e:
        print(f"Error fetching villages: {e}")
    return None

def test_upload():
    if not os.path.exists(FILE_PATH):
        print(f"File {FILE_PATH} not found.")
        return

    # Get a valid village ID
    village_id = get_village_id()
    if not village_id:
        print("No villages found. Cannot proceed with upload test without a village ID.")
        # Optionally create a dummy village if needed, but for now just report
        return

    print(f"Using Village ID: {village_id}")

    try:
        with open(FILE_PATH, 'rb') as f:
            files = {'file': (FILE_PATH, f, 'application/geo+json')}
            data = {'village_id': village_id}
            
            print(f"Uploading {FILE_PATH} to {API_URL}...")
            response = requests.post(API_URL, files=files, data=data)
            
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text}")
            
            if response.status_code == 200:
                print("✅ Upload Test Passed!")
            else:
                print("❌ Upload Test Failed!")
    except Exception as e:
        print(f"Exception during request: {e}")

if __name__ == "__main__":
    test_upload()
