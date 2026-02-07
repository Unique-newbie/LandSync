"""Comprehensive Demo Data Seeder for LandSync - Fixed Schema"""
import sqlite3
import uuid
import json
import random
from datetime import datetime

conn = sqlite3.connect('LandSync.db')
cursor = conn.cursor()

print("=== LandSync Demo Data Seeder ===")

# Clear existing demo data
print("Clearing old data...")
cursor.execute("DELETE FROM matches")
cursor.execute("DELETE FROM text_records")
cursor.execute("DELETE FROM parcels")
cursor.execute("DELETE FROM villages")
conn.commit()

OWNER_NAMES = [
    "Ramesh Kumar", "Suresh Sharma", "Mahesh Verma", "Rajesh Singh",
    "Mukesh Yadav", "Dinesh Patel", "Ganesh Gupta", "Lokesh Joshi",
    "Naresh Agarwal", "Hitesh Mittal", "Pradeep Chauhan", "Sandeep Rathore",
    "Kuldeep Meena", "Hardeep Saini", "Jaspreet Kaur", "Manpreet Singh"
]

VILLAGES = [
    {"name": "Mandore", "district": "Jodhpur", "tehsil": "Jodhpur", "state": "Rajasthan"},
    {"name": "Osian", "district": "Jodhpur", "tehsil": "Osian", "state": "Rajasthan"},
    {"name": "Phalodi", "district": "Jodhpur", "tehsil": "Phalodi", "state": "Rajasthan"},
    {"name": "Bilara", "district": "Jodhpur", "tehsil": "Bilara", "state": "Rajasthan"},
    {"name": "Pipar", "district": "Jodhpur", "tehsil": "Pipar", "state": "Rajasthan"},
]

village_ids = []

# Create Villages - matching actual schema
print("Creating villages...")
for v in VILLAGES:
    vid = str(uuid.uuid4())
    village_ids.append(vid)
    cursor.execute("""
        INSERT INTO villages (id, village_id, name, name_hindi, district, tehsil, state, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (vid, f"VIL-{random.randint(1000,9999)}", v["name"], v["name"] + " (Hindi)", 
          v["district"], v["tehsil"], v["state"], datetime.now().isoformat()))
print(f"  Created {len(VILLAGES)} villages")

# Create Parcels and Text Records
print("Creating parcels and text records...")
all_parcels = []
all_records = []

for village_idx, village_id in enumerate(village_ids):
    village_name = VILLAGES[village_idx]["name"]
    num_parcels = random.randint(8, 12)
    
    for i in range(num_parcels):
        parcel_id = str(uuid.uuid4())
        plot_id = f"{village_name[:3].upper()}/{random.randint(100, 999)}/{i+1}"
        owner = random.choice(OWNER_NAMES)
        area = round(random.uniform(500, 5000), 2)
        
        base_lat = 26.2 + village_idx * 0.05
        base_lon = 73.0 + village_idx * 0.05
        geometry = {
            "type": "Polygon",
            "coordinates": [[
                [base_lon + i*0.008, base_lat],
                [base_lon + i*0.008 + 0.006, base_lat],
                [base_lon + i*0.008 + 0.006, base_lat + 0.005],
                [base_lon + i*0.008, base_lat + 0.005],
                [base_lon + i*0.008, base_lat]
            ]]
        }
        
        cursor.execute("""
            INSERT INTO parcels (id, plot_id, owner_name, owner_name_hindi, area_sqm, area_hectares,
                                 geometry_json, centroid_lat, centroid_lng, village_id, status,
                                 source_file, attributes_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (parcel_id, plot_id, owner, owner + " (Hindi)", area, round(area/10000, 4),
              json.dumps(geometry), base_lat + 0.0025, base_lon + i*0.008 + 0.003, village_id, "active",
              "demo_seed.py", json.dumps({"land_type": random.choice(["agricultural", "residential"])}),
              datetime.now().isoformat(), datetime.now().isoformat()))
        
        all_parcels.append({"id": parcel_id, "plot_id": plot_id, "owner": owner, "area": area, "village_id": village_id})
        
        # Create matching Text Record
        record_id = str(uuid.uuid4())
        record_area = area + random.uniform(-50, 50)
        record_owner = owner if random.random() > 0.15 else owner.replace("Kumar", "Kumaar")
        
        cursor.execute("""
            INSERT INTO text_records (id, record_id, plot_id, owner_name, owner_name_hindi, area_declared,
                                      area_unit, village_id, khata_number, khasra_number, father_name,
                                      source_file, raw_data_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (record_id, f"REC-{random.randint(10000,99999)}", plot_id, record_owner, record_owner + " (Hindi)",
              round(record_area, 2), "sqm", village_id, f"K-{random.randint(100,999)}", 
              f"KH-{random.randint(1000,9999)}", f"S/o {random.choice(OWNER_NAMES)}", 
              "demo_seed.py", json.dumps({"source": "jamabandi"}),
              datetime.now().isoformat(), datetime.now().isoformat()))
        
        all_records.append({"id": record_id, "plot_id": plot_id, "owner": record_owner, "area": record_area, "village_id": village_id})

print(f"  Created {len(all_parcels)} parcels and {len(all_records)} text records")

# Create Matches
print("Creating matches...")
match_count = 0
for i, parcel in enumerate(all_parcels):
    if i < len(all_records):
        record = all_records[i]
        match_id = str(uuid.uuid4())
        
        name_score = random.uniform(80, 100) if parcel["owner"] == record["owner"] else random.uniform(65, 85)
        area_diff = abs(parcel["area"] - record["area"]) / parcel["area"] * 100
        area_score = max(0, 100 - area_diff * 2)
        id_score = 100.0
        total_score = (name_score * 0.4 + area_score * 0.3 + id_score * 0.3)
        
        if total_score >= 85:
            status = "matched"
            confidence = "high"
        elif total_score >= 70:
            status = "partial"
            confidence = "medium"
        else:
            status = "mismatch"
            confidence = "low"
        
        cursor.execute("""
            INSERT INTO matches (id, parcel_id, text_record_id, match_score, name_score, area_score, 
                                id_score, status, confidence_level, algorithm_details_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (match_id, parcel["id"], record["id"], round(total_score, 2), 
              round(name_score, 2), round(area_score, 2), round(id_score, 2),
              status, confidence, json.dumps({"algorithm": "combined", "area_tolerance": 10}),
              datetime.now().isoformat(), datetime.now().isoformat()))
        match_count += 1

print(f"  Created {match_count} matches")

conn.commit()
conn.close()

print("\n=== Demo Data Seeding Complete ===")
print(f"Villages: {len(VILLAGES)}")
print(f"Parcels: {len(all_parcels)}")
print(f"Text Records: {len(all_records)}")
print(f"Matches: {match_count}")
print("\nRefresh your browser to see the data!")
