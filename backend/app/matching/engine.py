"""Matching Engine for Record Reconciliation"""

from typing import List, Dict, Any, Optional
from rapidfuzz import fuzz
from rapidfuzz.distance import Levenshtein, JaroWinkler
import re
import math


class MatchingEngine:
    """
    Reconciliation matching engine using multiple algorithms.
    
    Algorithms:
    - levenshtein: Edit distance based matching
    - jaro_winkler: Jaro-Winkler similarity (good for names)
    - cosine: Token-based cosine similarity
    - combined: Weighted combination of all methods
    """
    
    # Weight configuration for combined algorithm
    WEIGHTS = {
        "name": 0.40,    # Owner name match weight
        "area": 0.30,    # Area match weight  
        "id": 0.30       # Plot ID match weight
    }
    
    def __init__(
        self, 
        algorithm: str = "combined",
        area_tolerance: float = 5.0,
        name_threshold: float = 70.0
    ):
        """
        Initialize matching engine.
        
        Args:
            algorithm: Matching algorithm to use
            area_tolerance: Percentage tolerance for area matching
            name_threshold: Minimum score threshold for name matching
        """
        self.algorithm = algorithm
        self.area_tolerance = area_tolerance
        self.name_threshold = name_threshold
    
    def run_matching(
        self,
        parcels: List[Dict[str, Any]],
        records: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Run matching between parcels and text records.
        
        Args:
            parcels: List of parcel dictionaries
            records: List of text record dictionaries
            
        Returns:
            List of match results
        """
        matches = []
        
        # Index records by plot_id for faster lookup
        records_by_plot_id = {}
        for record in records:
            plot_id = self._normalize_id(record.get("plot_id", ""))
            if plot_id not in records_by_plot_id:
                records_by_plot_id[plot_id] = []
            records_by_plot_id[plot_id].append(record)
        
        # Match each parcel
        for parcel in parcels:
            parcel_plot_id = self._normalize_id(parcel.get("plot_id", ""))
            parcel_owner = self._normalize_name(parcel.get("owner_name", ""))
            parcel_area = float(parcel.get("area", 0))
            
            best_match = None
            best_score = 0
            
            # First, try exact plot_id match
            if parcel_plot_id in records_by_plot_id:
                for record in records_by_plot_id[parcel_plot_id]:
                    match_result = self._calculate_match(parcel, record)
                    if match_result["total_score"] > best_score:
                        best_score = match_result["total_score"]
                        best_match = {**match_result, "record": record}
            
            # If no exact match, search all records
            if best_match is None or best_score < 80:
                for record in records:
                    match_result = self._calculate_match(parcel, record)
                    if match_result["total_score"] > best_score:
                        best_score = match_result["total_score"]
                        best_match = {**match_result, "record": record}
            
            if best_match:
                matches.append({
                    "parcel_id": parcel.get("id"),
                    "record_id": best_match["record"].get("id"),
                    "total_score": round(best_score, 2),
                    "name_score": round(best_match["name_score"], 2),
                    "area_score": round(best_match["area_score"], 2),
                    "id_score": round(best_match["id_score"], 2)
                })
        
        return matches
    
    def _calculate_match(
        self, 
        parcel: Dict[str, Any], 
        record: Dict[str, Any]
    ) -> Dict[str, float]:
        """Calculate match scores between parcel and record"""
        
        # Extract and normalize values
        parcel_name = self._normalize_name(parcel.get("owner_name", ""))
        record_name = self._normalize_name(record.get("owner_name", ""))
        
        parcel_id = self._normalize_id(parcel.get("plot_id", ""))
        record_id = self._normalize_id(record.get("plot_id", ""))
        
        parcel_area = float(parcel.get("area", 0))
        record_area = float(record.get("area", 0))
        
        # Calculate individual scores
        name_score = self._calculate_name_score(parcel_name, record_name)
        id_score = self._calculate_id_score(parcel_id, record_id)
        area_score = self._calculate_area_score(parcel_area, record_area)
        
        # Calculate total score based on algorithm
        if self.algorithm == "levenshtein":
            total_score = name_score  # Only name matching
        elif self.algorithm == "jaro_winkler":
            total_score = self._jaro_winkler_score(parcel_name, record_name)
        elif self.algorithm == "cosine":
            total_score = self._cosine_score(parcel_name, record_name)
        else:  # combined
            total_score = (
                self.WEIGHTS["name"] * name_score +
                self.WEIGHTS["area"] * area_score +
                self.WEIGHTS["id"] * id_score
            )
        
        return {
            "name_score": name_score,
            "area_score": area_score,
            "id_score": id_score,
            "total_score": total_score
        }
    
    def _calculate_name_score(self, name1: str, name2: str) -> float:
        """Calculate name similarity score (0-100)"""
        
        if not name1 or not name2:
            return 0.0
        
        if name1 == name2:
            return 100.0
        
        # Use RapidFuzz for fuzzy matching
        # Combine multiple methods for robustness
        ratio = fuzz.ratio(name1, name2)
        partial_ratio = fuzz.partial_ratio(name1, name2)
        token_sort = fuzz.token_sort_ratio(name1, name2)
        token_set = fuzz.token_set_ratio(name1, name2)
        
        # Weighted average
        return (ratio * 0.25 + partial_ratio * 0.25 + 
                token_sort * 0.25 + token_set * 0.25)
    
    def _calculate_id_score(self, id1: str, id2: str) -> float:
        """Calculate plot ID match score (0-100)"""
        
        if not id1 or not id2:
            return 0.0
        
        if id1 == id2:
            return 100.0
        
        # Use simple ratio for IDs
        return fuzz.ratio(id1, id2)
    
    def _calculate_area_score(self, area1: float, area2: float) -> float:
        """Calculate area match score based on tolerance (0-100)"""
        
        if area1 == 0 or area2 == 0:
            return 0.0
        
        if area1 == area2:
            return 100.0
        
        # Calculate percentage difference
        diff_percent = abs(area1 - area2) / max(area1, area2) * 100
        
        if diff_percent <= self.area_tolerance:
            # Within tolerance - scale from 100 to 80
            return 100.0 - (diff_percent / self.area_tolerance * 20)
        elif diff_percent <= self.area_tolerance * 2:
            # Slightly over tolerance
            return 80.0 - ((diff_percent - self.area_tolerance) / self.area_tolerance * 30)
        elif diff_percent <= self.area_tolerance * 5:
            # Significant difference
            return 50.0 - ((diff_percent - self.area_tolerance * 2) / (self.area_tolerance * 3) * 30)
        else:
            # Large difference
            return max(0.0, 20.0 - (diff_percent - self.area_tolerance * 5) / 10)
    
    def _jaro_winkler_score(self, s1: str, s2: str) -> float:
        """Calculate Jaro-Winkler similarity score (0-100)"""
        
        if not s1 or not s2:
            return 0.0
        
        # RapidFuzz returns normalized similarity (0-1)
        return JaroWinkler.normalized_similarity(s1, s2) * 100
    
    def _cosine_score(self, s1: str, s2: str) -> float:
        """Calculate cosine similarity based on tokens (0-100)"""
        
        if not s1 or not s2:
            return 0.0
        
        # Tokenize
        tokens1 = set(s1.lower().split())
        tokens2 = set(s2.lower().split())
        
        if not tokens1 or not tokens2:
            return 0.0
        
        # Calculate cosine similarity
        intersection = tokens1.intersection(tokens2)
        
        if not intersection:
            return 0.0
        
        cosine = len(intersection) / math.sqrt(len(tokens1) * len(tokens2))
        return cosine * 100
    
    def _normalize_name(self, name: str) -> str:
        """Normalize a name for matching"""
        
        if not name:
            return ""
        
        # Convert to lowercase
        name = name.lower().strip()
        
        # Remove common prefixes/suffixes
        prefixes = ["shri", "smt", "mr", "mrs", "ms", "dr", "prof", "sh", "श्री", "श्रीमती"]
        for prefix in prefixes:
            if name.startswith(prefix + " "):
                name = name[len(prefix) + 1:]
        
        # Remove special characters but keep Hindi
        name = re.sub(r'[^\w\s\u0900-\u097F]', '', name)
        
        # Collapse multiple spaces
        name = re.sub(r'\s+', ' ', name).strip()
        
        return name
    
    def _normalize_id(self, plot_id: str) -> str:
        """Normalize a plot ID for matching"""
        
        if not plot_id:
            return ""
        
        # Convert to lowercase and remove spaces
        plot_id = str(plot_id).lower().strip()
        
        # Remove common separators
        plot_id = re.sub(r'[-/\\.]', '', plot_id)
        
        # Remove leading zeros in numbers
        parts = plot_id.split()
        normalized_parts = []
        for part in parts:
            if part.isdigit():
                normalized_parts.append(str(int(part)))
            else:
                normalized_parts.append(part)
        
        return ''.join(normalized_parts)
    
    def get_algorithm_info(self) -> Dict[str, Any]:
        """Get information about the current algorithm configuration"""
        
        return {
            "algorithm": self.algorithm,
            "area_tolerance": self.area_tolerance,
            "name_threshold": self.name_threshold,
            "weights": self.WEIGHTS,
            "description": {
                "levenshtein": "Edit distance based name matching",
                "jaro_winkler": "Jaro-Winkler similarity (optimized for names)",
                "cosine": "Token-based cosine similarity",
                "combined": "Weighted combination of name, area, and ID matching"
            }.get(self.algorithm, "Unknown")
        }
