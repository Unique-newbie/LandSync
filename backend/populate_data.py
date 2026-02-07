import asyncio
import json
import random
import sys
import os

# Ensure we can import app modules
sys.path.append(os.getcwd())

from sqlalchemy import select
from app.core.database import AsyncSessionLocal, init_db
from app.models.models import Village, Parcel, TextRecord, Match, MatchStatus, ConfidenceLevel, User, Role

async def populate():
    print("Starting data population...")
    
    async with AsyncSessionLocal() as session:
        # 1. Ensure Village exists
        print("Checking for existing village...")
        result = await session.execute(select(Village).where(Village.name == "Mandore"))
        village = result.scalar_one_or_none()
        
        if not village:
            print("Creating village 'Mandore'...")
            village = Village(
                name="Mandore",
                name_hindi="मंडोर",
                district="Jodhpur",
                tehsil="Jodhpur",
                state="Rajasthan",
                village_id="V_001"
            )
            session.add(village)
            await session.commit()
            await session.refresh(village)
        else:
            print("Village 'Mandore' already exists.")

        village_id = village.id
        
        # 2. Check and Create Parcels
        print("Checking/Creating Parcels...")
        result = await session.execute(select(Parcel).where(Parcel.village_id == village_id))
        existing_parcels = result.scalars().all()
        
        if not existing_parcels:
            print("Creating 10 dummy parcels...")
            parcels = []
            base_lat = 26.35
            base_lng = 73.05
            
            for i in range(1, 11):
                offset = i * 0.001
                # Create a small square polygon
                p1 = [base_lng + offset, base_lat + offset]
                p2 = [base_lng + offset + 0.0005, base_lat + offset]
                p3 = [base_lng + offset + 0.0005, base_lat + offset + 0.0005]
                p4 = [base_lng + offset, base_lat + offset + 0.0005]
                
                geometry = {
                    "type": "Polygon",
                    "coordinates": [[p1, p2, p3, p4, p1]]
                }
                
                parcel = Parcel(
                    plot_id=f"P_{i:03d}",
                    owner_name=f"Farmer {i}",
                    owner_name_hindi=f"किसान {i}",
                    area_sqm=2500.0,
                    area_hectares=0.25,
                    geometry_json=json.dumps(geometry),
                    village_id=village_id,
                    source_file="dummy_import.geojson",
                    attributes_json=json.dumps({"soil_type": "Sandy", "irrigation": "Canal"})
                )
                parcels.append(parcel)
            
            session.add_all(parcels)
            await session.commit()
            print("10 Parcels created.")
            
            # Re-fetch to get IDs
            result = await session.execute(select(Parcel).where(Parcel.village_id == village_id))
            existing_parcels = result.scalars().all()
        else:
            print(f"Found {len(existing_parcels)} existing parcels.")

        # 3. Check and Create Text Records
        print("Checking/Creating Text Records...")
        result = await session.execute(select(TextRecord).where(TextRecord.village_id == village_id))
        existing_records = result.scalars().all()
        
        if not existing_records:
            print("Creating 10 dummy text records...")
            records = []
            
            for i in range(1, 11):
                # Introduce some mismatch for P_003
                declared_area = 2500.0
                if i == 3:
                     declared_area = 2000.0 # Mismatch
                
                record = TextRecord(
                    record_id=f"REC_{i:03d}",
                    plot_id=f"P_{i:03d}",
                    owner_name=f"Farmer {i}",
                    owner_name_hindi=f"किसान {i}",
                    area_declared=declared_area,
                    area_unit="sqm",
                    village_id=village_id,
                    khata_number=f"K_{i}",
                    khasra_number=f"Kh_{i}",
                    father_name=f"Father of {i}",
                    source_file="dummy_records.csv",
                    raw_data_json=json.dumps({"original_row": i})
                )
                records.append(record)
            
            session.add_all(records)
            await session.commit()
            print("10 Text Records created.")
            
            # Re-fetch
            result = await session.execute(select(TextRecord).where(TextRecord.village_id == village_id))
            existing_records = result.scalars().all()
        else:
            print(f"Found {len(existing_records)} existing text records.")

        # 4. Check and Create Matches
        print("Checking/Creating Matches...")
        # Create a map of plot_id to objects
        parcel_map = {p.plot_id: p for p in existing_parcels}
        record_map = {r.plot_id: r for r in existing_records}
        
        matches_to_create = []
        
        for plot_id, parcel in parcel_map.items():
            if plot_id in record_map:
                record = record_map[plot_id]
                
                # Check if match already exists
                result = await session.execute(
                    select(Match).where(
                        (Match.parcel_id == parcel.id) & 
                        (Match.text_record_id == record.id)
                    )
                )
                if result.scalar_one_or_none():
                    continue
                
                # Logic to determine status
                status = MatchStatus.MATCHED
                match_score = 100.0
                area_score = 100.0
                
                if abs(float(parcel.area_sqm) - float(record.area_declared)) > 1.0:
                    status = MatchStatus.MISMATCH
                    match_score = 80.0
                    area_score = 60.0 # Dummy low score
                
                match = Match(
                    parcel_id=parcel.id,
                    text_record_id=record.id,
                    match_score=match_score,
                    name_score=100.0,
                    area_score=area_score,
                    id_score=100.0,
                    status=status,
                    confidence_level=ConfidenceLevel.HIGH if status == MatchStatus.MATCHED else ConfidenceLevel.MEDIUM,
                    algorithm_details_json=json.dumps({"method": "dummy_script"})
                )
                matches_to_create.append(match)
        
        if matches_to_create:
            session.add_all(matches_to_create)
            await session.commit()
            print(f"Created {len(matches_to_create)} new matches.")
        else:
            print("No new matches needed.")

    print("Dummy data population complete!")

if __name__ == "__main__":
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(populate())
