# Tahsilat Raporu - Data Import and Processing Guide

## 📋 **Import Process Overview**

The data import system handles Excel files containing payment data with the following workflow:

### **1. File Upload & Processing**
```
User uploads Excel file → API processes → Data validation → Database insertion
```

## 🔧 **Key Files and Their Roles**

### **Frontend Import Interface**
- **`pages/import-new.tsx`** - Modern import page with duplicate detection
- **`pages/import.tsx`** - Legacy import page (deprecated)

### **Backend Processing Endpoints**
- **`pages/api/import/excel.ts`** - Main Excel processing endpoint
- **`pages/api/import/check-duplicates.ts`** - Duplicate detection logic  
- **`pages/api/import/confirm-import.ts`** - Final import confirmation

### **Python Backend (Alternative)**
- **`api/utils/data_import.py`** - Python-based import utilities

## 📊 **Data Processing Flow**

### **1. Excel File Structure Expected**
The system expects Turkish column headers:
- **Tarih** - Payment date (required)
- **Müşteri Adı Soyadı** - Customer name
- **Ödenen Tutar** - Paid amount  
- **Ödenen Döviz** - Currency
- **Proje Adı** - Project name
- **Tahsilat Şekli** - Payment method

### **2. Date Processing**
```typescript
function parseDate(dateValue: any): string | null {
  // Handles multiple formats:
  // - Excel serial numbers (44927 → 2023-01-15)
  // - DD/MM/YYYY format (15/01/2023)
  // - JavaScript Date objects
  // Returns ISO format (YYYY-MM-DD) or null if invalid
}
```

### **3. Amount Processing**
```typescript
function parseAmount(amountStr: string | number): number {
  // Handles Turkish number format: 1.234,56 → 1234.56
  // Removes currency symbols and spaces
  // Converts to decimal number
}
```

### **4. Data Validation**
- Checks for required "Tarih" column
- Validates date formats
- Converts Turkish payment methods to English
- Handles currency conversion

### **5. Database Insertion**
```sql
INSERT INTO payments (
  customer_name, payment_date, payment_method,
  amount_due, currency_due, amount_paid, currency_paid,
  year, month, project_name, status, ...
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ...)
```

## 🚀 **How to Use the Import System**

### **Method 1: New Import Page (Recommended)**
1. Go to `/import-new` page
2. Upload Excel file
3. Review detected duplicates
4. Confirm import

### **Method 2: API Direct Upload**
```bash
curl -X POST http://localhost:3000/api/import/excel \
  -F "file=@your_payments.xlsx"
```

### **Method 3: Python Script**
```python
from api.utils.data_import import process_import_file
result = await process_import_file(uploaded_file)
```

## 🔍 **Data Mapping Configuration**

The system uses pattern matching to map Turkish Excel headers to database fields:

```typescript
const FIELD_PATTERNS = {
  'customer_name': /^Müşteri Adı Soyadı$/i,
  'payment_date': /^Tarih$/i,
  'amount_paid': /^Ödenen Tutar/i,
  'currency_paid': /^Ödenen Döviz$/i,
  'project_name': /^Proje Adı$/i,
  // ... more patterns
};
```

## ⚠️ **Common Issues and Solutions**

### **"Invalid Date" Error**
- **Cause**: Empty or malformed date cells in Excel
- **Solution**: Use `formatDate()` helper function in UI
- **Fix**: Returns "N/A" for null dates instead of "Invalid Date"

### **Missing "Tarih" Column**
- **Cause**: Excel file doesn't have the required date column
- **Solution**: Ensure your Excel has a column named exactly "Tarih"

### **Amount Parsing Issues**
- **Cause**: Turkish number format (1.234,56) not recognized
- **Solution**: `parseAmount()` function handles format conversion

## 🛠️ **Debugging Import Issues**

### **Enable Debug Logging**
The import process includes extensive debugging:
```typescript
console.log('DEBUG: Raw date value:', dateValue);
console.log('DEBUG: Parsed amount:', parsedAmount);
console.log('DEBUG: Field mapping:', FIELD_MAPPING);
```

### **Check Import Results**
```typescript
// API returns detailed results
{
  success: true,
  inserted: 150,
  errors: [],
  totalRows: 150,
  message: "Import completed successfully"
}
```

## 📝 **Example Excel Data Format**

| Tarih | Müşteri Adı Soyadı | Ödenen Tutar | Ödenen Döviz | Proje Adı |
|-------|-------------------|--------------|--------------|-----------|
| 15/01/2023 | John Doe | 1.500,00 | TRY | Model Kuyum |
| 16/01/2023 | Jane Smith | 2.000,00 | USD | Model Sanayi |

## 🔧 **Advanced Configuration**

### **Custom Field Mapping**
You can modify `FIELD_PATTERNS` to support different column names:
```typescript
'payment_date': /^(Tarih|Date|Payment Date)$/i,
```

### **Currency Conversion**
The system includes automatic currency conversion logic for non-USD payments.

### **Duplicate Detection**
- Compares dates within ±2 days
- Checks amount differences within 5%
- Matches customer names and project names