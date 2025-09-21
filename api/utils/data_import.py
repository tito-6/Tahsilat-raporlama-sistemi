from fastapi import HTTPException, UploadFile
import pandas as pd
import json
from io import BytesIO
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple

# Required fields for payment data import
REQUIRED_FIELDS = [
    'payment_date',
    'customer_name',
    'property_id',
    'payment_channel',
    'amount_tl'
]

# Only needed fields for import
FIELD_MAPPING = {
    'payment_date': ['Tarih'],  # ONLY recognize "Tarih" as the payment date field
    'paid_amount': ['Ödenen Tutar(Σ:12,767,688.23)', 'paid_amount'],
    'paid_currency': ['Ödenen Döviz', 'paid_currency'],
}


def validate_and_normalize_data(data: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Validates and normalizes imported payment data.
    
    Args:
        data: List of payment records as dictionaries
        
    Returns:
        Tuple of (normalized data, error messages)
    """
    normalized_data = []
    errors = []
    
    def _parse_date(date_value):
        """Robust date parsing for Tarih column"""
        # Handle empty values
        if date_value is None or str(date_value).lower() in ['nan', 'none', '']:
            return None
            
        # If it's already a datetime object (from pandas)
        if hasattr(date_value, 'date'):
            return date_value.date()
            
        # Handle numeric Excel dates (number of days since 1899/12/30)
        try:
            if isinstance(date_value, (int, float)) or (isinstance(date_value, str) and date_value.replace('.', '', 1).isdigit()):
                num_value = float(date_value)
                # Excel date system starts from December 30, 1899
                base_date = datetime(1899, 12, 30)
                delta_days = int(num_value)
                date_obj = base_date + pd.Timedelta(days=delta_days)
                print(f"DEBUG: Converted Excel numeric date {date_value} to {date_obj.date().isoformat()}")
                return date_obj.date()
        except Exception as e:
            print(f"DEBUG: Failed to parse numeric date {date_value}: {e}")
            pass
        
        # Handle string dates
        date_str = str(date_value).strip()
        if not date_str:
            return None
            
        # Handle YYYY-MM-DD format directly
        if '-' in date_str and len(date_str) == 10:
            try:
                year, month, day = map(int, date_str.split('-'))
                if 1900 <= year <= 2100 and 1 <= month <= 12 and 1 <= day <= 31:
                    return datetime(year, month, day).date()
            except Exception:
                pass
            
        # Turkish date formats first (most common)
        formats = [
            '%d/%m/%Y',  # DD/MM/YYYY - Turkish format
            '%d.%m.%Y',  # DD.MM.YYYY - Turkish format
            '%d-%m-%Y',  # DD-MM-YYYY - Turkish format
            '%d/%m/%y',  # DD/MM/YY - Turkish format
            '%d.%m.%y',  # DD.MM.YY - Turkish format
            '%Y-%m-%d',  # YYYY-MM-DD - ISO format
            '%Y/%m/%d',  # YYYY/MM/DD - Alternative format
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt).date()
            except Exception:
                continue
        
        print(f"DEBUG: Failed to parse date using all formats: {date_value}")
        return None

    def parse_amount(val):
        if val is None:
            return 0.0
        if isinstance(val, str):
            val = val.replace('.', '').replace(',', '.')
            try:
                return float(val)
            except Exception:
                return 0.0
        try:
            return float(val)
        except Exception:
            return 0.0

    for idx, record in enumerate(data):
        row_num = idx + 1
        normalized_record = {}
        
        # CRITICAL: Check for "Tarih" field directly first
        if 'Tarih' in record:
            raw_date = record['Tarih']
        else:
            # Fall back to the mapping as a last resort
            found_date = False
            for alias in FIELD_MAPPING['payment_date']:
                if alias in record:
                    raw_date = record[alias]
                    found_date = True
                    break
            
            if not found_date:
                errors.append(f"Row {row_num}: Missing required 'Tarih' field")
                continue
        
        # Map other fields normally
        for field, aliases in FIELD_MAPPING.items():
            if field != 'payment_date':  # Skip payment_date as we already handled it
                for alias in aliases:
                    if alias in record:
                        normalized_record[field] = record[alias]
                        break
        
        # Process the payment date
        date_obj = _parse_date(raw_date)
        if date_obj is None:
            errors.append(f"Row {row_num}: Invalid Tarih format: {raw_date}")
            continue
            
        normalized_record['payment_date'] = date_obj.isoformat()
        
        # Amount parsing
        normalized_record['paid_amount'] = parse_amount(normalized_record.get('paid_amount', 0))
        
        # Currency normalization
        val = normalized_record.get('paid_currency', '')
        normalized_record['paid_currency'] = val.strip().upper() if isinstance(val, str) else 'USD'
        
        # Defensive: If paid_amount is None or not a number, set to 0
        if normalized_record['paid_amount'] is None or not isinstance(normalized_record['paid_amount'], (int, float)):
            normalized_record['paid_amount'] = 0.0
            
        # Only keep payment_date, paid_amount, paid_currency
        normalized_data.append({
            'payment_date': normalized_record['payment_date'],
            'paid_amount': normalized_record['paid_amount'],
            'paid_currency': normalized_record['paid_currency']
        })
    
    return normalized_data, errors


async def process_import_file(file: UploadFile) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Processes an uploaded file and extracts payment data.
    
    Args:
        file: The uploaded file (CSV, XLSX, or JSON)
        
    Returns:
        Tuple of (extracted data, error messages)
    """
    file_extension = file.filename.split('.')[-1].lower()
    content = await file.read()
    
    try:
        if file_extension == 'csv':
            df = pd.read_csv(BytesIO(content), dtype=str)
            print('DEBUG: Detected columns:', list(df.columns))
            # Check if Tarih column exists
            if 'Tarih' not in df.columns:
                raise HTTPException(status_code=400, detail="Error: 'Tarih' column not found. This column is required for payment dates.")
            print('DEBUG: First 5 Tarih values:', df['Tarih'].head(5).tolist())
            data = df.to_dict(orient='records')
        elif file_extension in ['xlsx', 'xls']:
            # Set parse_dates=True to handle Excel dates properly
            df = pd.read_excel(BytesIO(content), parse_dates=['Tarih'])
            print('DEBUG: Detected columns:', list(df.columns))
            # Check if Tarih column exists
            if 'Tarih' not in df.columns:
                raise HTTPException(status_code=400, detail="Error: 'Tarih' column not found. This column is required for payment dates.")
            
            # Convert dates to proper format
            if pd.api.types.is_datetime64_any_dtype(df['Tarih']):
                df['Tarih'] = df['Tarih'].dt.strftime('%Y-%m-%d')
            
            print('DEBUG: First 5 Tarih values (processed):', df['Tarih'].head(5).tolist())
            data = df.to_dict(orient='records')
        elif file_extension == 'json':
            data = json.loads(content)
            # Check if Tarih key exists in the first record
            if data and 'Tarih' not in data[0]:
                raise HTTPException(status_code=400, detail="Error: 'Tarih' field not found. This field is required for payment dates.")
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload CSV, XLSX, or JSON files.")
        # Validate and normalize the data
        normalized_data, errors = validate_and_normalize_data(data)
        print(f"First 5 normalized rows: {normalized_data[:5]}")
        return normalized_data, errors
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")