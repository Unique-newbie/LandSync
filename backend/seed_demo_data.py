"""Seed comprehensive demo data into the database"""

import asyncio
import json
import random
from datetime import datetime
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import AsyncSessionLocal, async_engine
from app.models.models import Base, Village, Parcel, TextRecord, Match
from sqlalchemy import select


DEMO_VILLAGES = [
    {"village_id": "RAJ-JOD-001", "name": "Mandore", "name_hindi": "Mandore", "district": "Jodhpur", "tehsil": "Jodhpur", "state": "Rajasthan"},
    {"village_id": "RAJ-JAI-001", "name": "Sanganer", "name_hindi": "Sanganer", "district": "Jaipur", "tehsil": "Sanganer", "state": "Rajasthan"},
    {"village_id": "RAJ-UDA-001", "name": "Gogunda", "name_hindi": "Gogunda", "district": "Udaipur", "tehsil": "Gogunda", "state": "Rajasthan"},
]

DEMO_OWNERS = [
    "Ramesh Kumar", "Suresh Singh", "Mahendra Sharma", "Rajendra Patel",
    "Govind Meena", "Lakshmi Devi", "Kailash Chand", "Bhagwan Das",
    "Mohan Lal", "Shanti Bai", "Ratan Singh", "Prema Ram",
]


def generate_polygon(center_lat, center_lon, size=0.001):
    return {
        "type": "Polygon",
        "coordinates": [[
            [center_lon - size, center_lat - size],
            [center_lon + size, center_lat - size],
            [center_lon + size, center_lat + size],
            [center_lon - size, center_lat + size],
            [center_lon - size, center_lat - size]
        ]]
    }


async def seed_demo_data():
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Village))
        if result.scalars().first():
            print("[SKIP] Demo data already exists")
            return
        
        print("[START] Creating demo data...")
        
        villages = []
        for v_data in DEMO_VILLAGES:
            village = Village(**v_data)
            session.add(village)
            villages.append(village)
        await session.flush()
        print(f"[OK] Created {len(villages)} villages")
        
        village_coords = {
            "RAJ-JOD-001": (26.2389, 73.0243),
            "RAJ-JAI-001": (26.8269, 75.7869),
            "RAJ-UDA-001": (24.5854, 73.7125),
        }
        
        all_parcels = []
        all_text_records = []
        
        for village in villages:
            base_lat, base_lon = village_coords.get(village.village_id, (26.0, 73.0))
            num_parcels = random.randint(15, 20)
            
            for i in range(num_parcels):
                owner_name = random.choice(DEMO_OWNERS)
                plot_id = f"{village.village_id}-{i+1:03d}"
                
                lat = base_lat + random.uniform(-0.02, 0.02)
                lng = base_lon + random.uniform(-0.02, 0.02)
                area_sqm = random.uniform(500, 5000)
                
                geometry = generate_polygon(lat, lng, size=random.uniform(0.0005, 0.002))
                
                parcel = Parcel(
                    plot_id=plot_id,
                    owner_name=owner_name,
                    owner_name_hindi=owner_name,
                    area_sqm=area_sqm,
                    area_hectares=area_sqm / 10000,
                    area_bigha=area_sqm / 2500,
                    geometry_json=json.dumps(geometry),
                    centroid_lat=lat,
                    centroid_lng=lng,
                    village_id=village.id,
                    source_file="demo_data.geojson"
                )
                session.add(parcel)
                all_parcels.append(parcel)
                
                if random.random() < 0.8:
                    record_owner = owner_name
                    record_area = area_sqm * random.uniform(0.98, 1.02)
                else:
                    record_owner = owner_name.replace("Kumar", "Kr.").replace("Singh", "S.")
                    record_area = area_sqm * random.uniform(0.9, 1.1)
                
                text_record = TextRecord(
                    record_id=f"REC-{plot_id}",
                    plot_id=plot_id,
                    owner_name=record_owner,
                    owner_name_hindi=record_owner,
                    father_name=random.choice(DEMO_OWNERS),
                    khata_number=f"KH-{random.randint(100, 999)}",
                    khasra_number=f"{random.randint(1, 500)}/{random.randint(1, 20)}",
                    area_declared=record_area,
                    area_unit="sqm",
                    village_id=village.id,
                    source_file="demo_jamabandi.xlsx"
                )
                session.add(text_record)
                all_text_records.append(text_record)
            
            print(f"[OK] Created {num_parcels} parcels for {village.name}")
        
        await session.flush()
        
        matches_created = 0
        for parcel, text_record in zip(all_parcels, all_text_records):
            name_match = 100 if parcel.owner_name == text_record.owner_name else random.uniform(70, 95)
            area_diff = abs(float(parcel.area_sqm) - float(text_record.area_declared)) / float(parcel.area_sqm) * 100
            area_match = max(0, 100 - area_diff * 5)
            id_match = 100 if parcel.plot_id == text_record.plot_id else 0
            
            overall_score = (name_match * 0.4 + area_match * 0.3 + id_match * 0.3)
            
            if overall_score >= 90:
                status = "matched"
                confidence = "high"
            elif overall_score >= 70:
                status = "partial"
                confidence = "medium"
            else:
                status = "mismatch"
                confidence = "low"
            
            match = Match(
                parcel_id=parcel.id,
                text_record_id=text_record.id,
                match_score=overall_score,
                name_score=name_match,
                area_score=area_match,
                id_score=id_match,
                status=status,
                confidence_level=confidence,
                algorithm_details_json=json.dumps({"algorithm": "combined"})
            )
            session.add(match)
            matches_created += 1
        
        print(f"[OK] Created {matches_created} matches")
        
        await session.commit()
        print("[DONE] Demo data complete!")
        print(f"Summary: {len(villages)} villages, {len(all_parcels)} parcels, {matches_created} matches")


if __name__ == "__main__":
    asyncio.run(seed_demo_data())
