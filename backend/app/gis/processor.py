"""GIS Processing Module - Simplified for Development"""

import os
import json
import math
from typing import List, Dict, Any, Tuple, Optional


class GISProcessor:
    """
    GIS data processor for spatial files.
    
    Simplified version for development without geopandas/GDAL.
    Supports GeoJSON files only in this mode.
    """
    
    SUPPORTED_EXTENSIONS = ['.geojson', '.json']
    
    # Default field mappings (source -> target)
    DEFAULT_MAPPINGS = {
        'plot_id': ['plot_id', 'plotid', 'plot_no', 'parcel_id', 'id', 'fid'],
        'owner_name': ['owner_name', 'owner', 'name', 'malik_naam', 'malik'],
        'area': ['area', 'area_sqm', 'shape_area', 'area_m2', 'kshetra'],
        'village_id': ['village_id', 'village', 'gram', 'gaon']
    }
    
    def __init__(self, srid: int = 4326):
        """
        Initialize GIS processor.
        
        Args:
            srid: Spatial Reference ID (default: 4326 for WGS84)
        """
        self.srid = srid
    
    def process_file(
        self, 
        file_path: str,
        field_mappings: Optional[Dict[str, str]] = None
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Process a spatial file and extract parcel data.
        
        Args:
            file_path: Path to the spatial file
            field_mappings: Optional custom field mappings
            
        Returns:
            Tuple of (parcels_data, errors)
        """
        errors = []
        parcels_data = []
        
        # Validate file exists
        if not os.path.exists(file_path):
            errors.append({"error": f"File not found: {file_path}"})
            return parcels_data, errors
        
        # Get file extension
        _, ext = os.path.splitext(file_path.lower())
        
        if ext not in self.SUPPORTED_EXTENSIONS:
            errors.append({
                "error": f"Unsupported file type: {ext}. In development mode, only GeoJSON is supported."
            })
            return parcels_data, errors
        
        # Read GeoJSON
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                geojson_data = json.load(f)
        except Exception as e:
            errors.append({"error": f"Failed to read file: {str(e)}"})
            return parcels_data, errors
        
        # Process features
        features = geojson_data.get('features', [])
        if not features:
            errors.append({"error": "No features found in GeoJSON"})
            return parcels_data, errors
        
        for idx, feature in enumerate(features):
            try:
                properties = feature.get('properties', {})
                geometry = feature.get('geometry')
                
                if geometry is None:
                    errors.append({
                        "row": idx,
                        "error": "Missing geometry"
                    })
                    continue
                
                # Calculate area
                area_sqm = self._calculate_area_from_geojson(geometry)
                
                # Calculate centroid
                centroid = self._calculate_centroid(geometry)
                
                # Extract attributes
                parcel = {
                    "plot_id": self._get_property(properties, 'plot_id', str(idx)),
                    "owner_name": self._get_property(properties, 'owner_name', 'Unknown'),
                    "area_sqm": area_sqm,
                    "geometry_geojson": json.dumps(geometry),
                    "centroid_lat": centroid[1] if centroid else None,
                    "centroid_lng": centroid[0] if centroid else None,
                    "attributes": properties
                }
                
                parcels_data.append(parcel)
                
            except Exception as e:
                errors.append({
                    "row": idx,
                    "error": str(e)
                })
        
        return parcels_data, errors
    
    def _get_property(self, properties: Dict, field: str, default: Any = None) -> Any:
        """Get property value with fallback mappings"""
        
        # Try direct field name
        if field in properties and properties[field]:
            return properties[field]
        
        # Try mappings
        for mapped_field in self.DEFAULT_MAPPINGS.get(field, []):
            for key in properties:
                if key.lower() == mapped_field.lower():
                    if properties[key]:
                        return properties[key]
        
        return default
    
    def _calculate_area_from_geojson(self, geometry: Dict) -> float:
        """Calculate area in square meters from GeoJSON geometry"""
        
        geom_type = geometry.get('type', '')
        
        if geom_type != 'Polygon' and geom_type != 'MultiPolygon':
            return 0.0
        
        try:
            if geom_type == 'Polygon':
                coords = geometry.get('coordinates', [[]])[0]
                return self._polygon_area(coords)
            else:
                # MultiPolygon
                total_area = 0.0
                for polygon in geometry.get('coordinates', []):
                    if polygon:
                        total_area += self._polygon_area(polygon[0])
                return total_area
        except Exception:
            return 0.0
    
    def _polygon_area(self, coords: List[List[float]]) -> float:
        """
        Calculate polygon area using the Shoelace formula.
        Converts from degrees to approximate square meters.
        """
        if len(coords) < 3:
            return 0.0
        
        # Calculate area in degrees
        n = len(coords)
        area = 0.0
        
        for i in range(n):
            j = (i + 1) % n
            area += coords[i][0] * coords[j][1]
            area -= coords[j][0] * coords[i][1]
        
        area_deg = abs(area) / 2.0
        
        # Convert to square meters (approximate at centroid latitude)
        centroid = self._polygon_centroid(coords)
        if centroid:
            lat = centroid[1]
            lat_rad = math.radians(lat)
            meters_per_degree = 111320 * math.cos(lat_rad)
            area_sqm = area_deg * (meters_per_degree ** 2)
            return round(area_sqm, 4)
        
        return round(area_deg * 111320 * 111320, 4)
    
    def _polygon_centroid(self, coords: List[List[float]]) -> Optional[Tuple[float, float]]:
        """Calculate polygon centroid"""
        if len(coords) < 3:
            return None
        
        x_sum = sum(c[0] for c in coords)
        y_sum = sum(c[1] for c in coords)
        n = len(coords)
        
        return (x_sum / n, y_sum / n)
    
    def _calculate_centroid(self, geometry: Dict) -> Optional[Tuple[float, float]]:
        """Calculate geometry centroid"""
        
        geom_type = geometry.get('type', '')
        
        if geom_type == 'Point':
            coords = geometry.get('coordinates', [])
            return (coords[0], coords[1]) if len(coords) >= 2 else None
        
        elif geom_type == 'Polygon':
            coords = geometry.get('coordinates', [[]])[0]
            return self._polygon_centroid(coords)
        
        elif geom_type == 'MultiPolygon':
            # Return centroid of first polygon
            polys = geometry.get('coordinates', [])
            if polys and polys[0]:
                return self._polygon_centroid(polys[0][0])
        
        return None
    
    def validate_geometry(self, geometry: Dict) -> Tuple[bool, Optional[str]]:
        """Validate a GeoJSON geometry"""
        
        if geometry is None:
            return False, "Geometry is None"
        
        if 'type' not in geometry:
            return False, "Missing geometry type"
        
        if 'coordinates' not in geometry:
            return False, "Missing coordinates"
        
        return True, None
    
    def convert_to_geojson(self, parcels: List[Dict]) -> Dict[str, Any]:
        """Convert list of parcels to GeoJSON FeatureCollection"""
        
        features = []
        for parcel in parcels:
            geometry = json.loads(parcel.get('geometry_geojson', '{}'))
            
            feature = {
                "type": "Feature",
                "geometry": geometry,
                "properties": {
                    "plot_id": parcel.get('plot_id'),
                    "owner_name": parcel.get('owner_name'),
                    "area_sqm": parcel.get('area_sqm'),
                    "status": parcel.get('status', 'pending')
                }
            }
            features.append(feature)
        
        return {
            "type": "FeatureCollection",
            "features": features
        }
