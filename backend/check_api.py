import requests
import json

try:
    print("Checking API...")
    # 1. Check Root
    try:
        r = requests.get("http://localhost:8000/")
        print(f"Root Status: {r.status_code}")
    except Exception as e:
        print(f"Root failed: {e}")

    # 2. Check Villages
    print("\nChecking Villages...")
    r = requests.get("http://localhost:8000/api/v1/parcels/villages")
    print(f"Villages Status: {r.status_code}")
    villages = r.json()
    print(f"Villages Count: {len(villages)}")
    if len(villages) > 0:
        print(f"First Village: {villages[0]}")
        v_id = villages[0]['id']

        # 3. Check Parcels for Village
        print(f"\nChecking Parcels for Village {v_id}...")
        r = requests.get(f"http://localhost:8000/api/v1/parcels?village_id={v_id}")
        print(f"Parcels Status: {r.status_code}")
        parcels = r.json()
        print(f"Parcels Count: {len(parcels)}")
        
        # 4. Check Matches
        print(f"\nChecking Matches for Village {v_id}...")
        # Try both potential endpoints
        try:
             r = requests.get(f"http://localhost:8000/api/v1/reconcile/matches/{v_id}")
             print(f"Matches Status: {r.status_code}")
             matches = r.json()
             if isinstance(matches, list): # It might be a list or object
                 print(f"Matches Count: {len(matches)}")
             else:
                 print(f"Matches Response: {matches}")
        except Exception as e:
            print(f"Matches endpoint error: {e}")

    else:
        print("No villages found!")

except Exception as e:
    print(f"Fatal Error: {e}")
