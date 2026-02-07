"""Text Data Ingestion Service"""

import os
import csv
from typing import List, Dict, Any, Tuple, Optional
import pandas as pd


class TextDataProcessor:
    """
    Process text data files (CSV, Excel).
    
    Supports:
    - CSV (.csv)
    - Excel (.xlsx, .xls)
    """
    
    # Default field mappings (target -> possible source columns)
    DEFAULT_MAPPINGS = {
        'record_id': ['record_id', 'recordid', 'id', 'sr_no', 'serial'],
        'plot_id': ['plot_id', 'plotid', 'plot_no', 'khata_no', 'khasra_no'],
        'owner_name': ['owner_name', 'owner', 'name', 'malik_naam', 'malik', 'holder'],
        'area': ['area', 'area_sqm', 'kshetra', 'area_hectare', 'raqba'],
        'village_name': ['village', 'village_name', 'gram', 'gaon'],
        'khata_number': ['khata', 'khata_no', 'khewat'],
        'khasra_number': ['khasra', 'khasra_no', 'khasraNumber'],
        'father_name': ['father', 'father_name', 'pita', 's_o', 'son_of', 'w_o']
    }
    
    def __init__(self, encoding: str = 'utf-8'):
        """
        Initialize text data processor.
        
        Args:
            encoding: File encoding (default: utf-8)
        """
        self.encoding = encoding
    
    def process_file(
        self,
        file_path: str,
        field_mappings: Optional[Dict[str, str]] = None
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Process a text data file.
        
        Args:
            file_path: Path to the file
            field_mappings: Optional custom field mappings
            
        Returns:
            Tuple of (records_data, errors)
        """
        errors = []
        records = []
        
        if not os.path.exists(file_path):
            errors.append({"error": f"File not found: {file_path}"})
            return records, errors
        
        ext = os.path.splitext(file_path)[1].lower()
        
        try:
            if ext == '.csv':
                df = pd.read_csv(file_path, encoding=self.encoding)
            elif ext in ['.xlsx', '.xls']:
                df = pd.read_excel(file_path)
            else:
                errors.append({"error": f"Unsupported file type: {ext}"})
                return records, errors
        except Exception as e:
            errors.append({"error": f"Failed to read file: {str(e)}"})
            return records, errors
        
        # Get column mappings
        columns = df.columns.tolist()
        mappings = self._get_field_mappings(columns, field_mappings)
        
        # Process each row
        for idx, row in df.iterrows():
            try:
                record = {
                    "record_id": self._get_value(row, mappings, 'record_id', f"R_{idx}"),
                    "plot_id": self._get_value(row, mappings, 'plot_id', ""),
                    "owner_name": self._get_value(row, mappings, 'owner_name', "Unknown"),
                    "area": self._parse_area(self._get_value(row, mappings, 'area', 0)),
                    "area_unit": self._detect_area_unit(row, mappings),
                    "village_name": self._get_value(row, mappings, 'village_name', None),
                    "khata_number": self._get_value(row, mappings, 'khata_number', None),
                    "khasra_number": self._get_value(row, mappings, 'khasra_number', None),
                    "father_name": self._get_value(row, mappings, 'father_name', None),
                    "raw_row": row.to_dict()
                }
                
                # Validate required fields
                if not record["plot_id"]:
                    errors.append({
                        "row": idx,
                        "error": "Missing plot_id"
                    })
                    continue
                
                records.append(record)
                
            except Exception as e:
                errors.append({
                    "row": idx,
                    "error": str(e)
                })
        
        return records, errors
    
    def _get_field_mappings(
        self,
        columns: List[str],
        custom_mappings: Optional[Dict[str, str]] = None
    ) -> Dict[str, str]:
        """Determine field mappings from columns"""
        
        mappings = {}
        
        for target, sources in self.DEFAULT_MAPPINGS.items():
            # Check custom mappings first
            if custom_mappings and target in custom_mappings:
                if custom_mappings[target] in columns:
                    mappings[target] = custom_mappings[target]
                    continue
            
            # Try default sources (case-insensitive)
            for source in sources:
                for col in columns:
                    if col.lower().strip() == source.lower():
                        mappings[target] = col
                        break
                if target in mappings:
                    break
        
        return mappings
    
    def _get_value(
        self,
        row: pd.Series,
        mappings: Dict[str, str],
        field: str,
        default: Any = None
    ) -> Any:
        """Get value from row using mappings"""
        
        if field in mappings and mappings[field] in row.index:
            val = row[mappings[field]]
            if pd.notna(val):
                return val
        return default
    
    def _parse_area(self, value: Any) -> float:
        """Parse area value to float"""
        
        if value is None:
            return 0.0
        
        if isinstance(value, (int, float)):
            return float(value)
        
        # Try to extract number from string
        import re
        match = re.search(r'[\d.]+', str(value))
        if match:
            return float(match.group())
        
        return 0.0
    
    def _detect_area_unit(
        self,
        row: pd.Series,
        mappings: Dict[str, str]
    ) -> str:
        """Detect area unit from column name or value"""
        
        if 'area' in mappings:
            col_name = mappings['area'].lower()
            
            if 'hectare' in col_name:
                return 'hectare'
            elif 'sqm' in col_name or 'm2' in col_name:
                return 'sqm'
            elif 'bigha' in col_name:
                return 'bigha'
            elif 'acre' in col_name:
                return 'acre'
        
        return 'sqm'  # Default
    
    def convert_area(self, value: float, from_unit: str, to_unit: str = 'sqm') -> float:
        """Convert area between units"""
        
        # Conversion factors to sqm
        to_sqm = {
            'sqm': 1,
            'hectare': 10000,
            'acre': 4046.86,
            'bigha': 2529.29,  # Rajasthan bigha
            'biswa': 126.46   # 20 biswa = 1 bigha
        }
        
        if from_unit not in to_sqm or to_unit not in to_sqm:
            return value
        
        # Convert to sqm first
        sqm = value * to_sqm.get(from_unit, 1)
        
        # Convert from sqm to target
        return sqm / to_sqm.get(to_unit, 1)
    
    def validate_records(
        self,
        records: List[Dict[str, Any]]
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Validate records and identify issues.
        
        Returns:
            Tuple of (valid_records, validation_errors)
        """
        valid = []
        errors = []
        
        seen_plot_ids = set()
        
        for idx, record in enumerate(records):
            issues = []
            
            # Check for duplicates
            plot_id = record.get('plot_id', '')
            if plot_id in seen_plot_ids:
                issues.append("Duplicate plot_id")
            else:
                seen_plot_ids.add(plot_id)
            
            # Check for missing owner
            if not record.get('owner_name') or record['owner_name'] == 'Unknown':
                issues.append("Missing owner name")
            
            # Check for zero area
            if record.get('area', 0) <= 0:
                issues.append("Invalid or missing area")
            
            if issues:
                errors.append({
                    "record_index": idx,
                    "plot_id": plot_id,
                    "issues": issues
                })
            else:
                valid.append(record)
        
        return valid, errors
