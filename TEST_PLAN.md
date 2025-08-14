# Upload Pipeline Test Plan

## **Acceptance Tests**

### **Test 1: Upload sample .xlsx with standard columns**
**Steps:**
1. Create Excel file with columns: Date, Account, Category, Amount
2. Add sample data (5-10 rows)
3. Upload file
4. Verify progress: 0% → 100%
5. Verify console logs: `[normalize]`, `[store] setRaw`, `[derive]`
6. Verify UI: "Imported X rows" message
7. Verify KPIs & chart update with data

**Expected:** Complete pipeline works, data appears in UI

### **Test 2: Upload .csv with Italian headers and EU numbers**
**Steps:**
1. Create CSV with headers: Data, Conto, Categoria, Importo
2. Add data with EU format: 1.234,56
3. Upload file
4. Verify normalization: headers mapped correctly
5. Verify amount parsing: 1.234,56 → 1234.56
6. Verify data appears in UI

**Expected:** Italian headers and EU numbers parsed correctly

### **Test 3: Upload file with unknown headers**
**Steps:**
1. Create file with headers: Random, Unknown, Columns
2. Upload file
3. Verify ErrorBanner: "Missing required columns: date, account, category"
4. Verify available columns listed

**Expected:** Clear error message with missing columns listed

### **Test 4: Simulate worker error (fallback)**
**Steps:**
1. Break worker import path (already disabled)
2. Upload file
3. Verify fallback parsing works
4. Verify data still appears
5. Verify inline warning shown

**Expected:** Fallback parsing works, data appears, warning shown

### **Test 5: Empty data handling**
**Steps:**
1. Upload file with empty rows only
2. Verify ErrorBanner: "No valid data found"
3. Verify chart shows empty state

**Expected:** Clear error message, no phantom data

### **Test 6: Debug panel visibility**
**Steps:**
1. Upload file
2. Verify debug panel shows:
   - Last worker message
   - Store count
3. Verify console markers: `[worker]`, `[upload]`, `[store]`, `[derive]`

**Expected:** Debug info visible, console markers present

## **Console Log Verification**

Upload should produce these logs in sequence:
```
[upload] File upload started
[normalize] Starting normalization
[normalize] Headers found
[normalize] Header mapping
[normalize] Normalization complete
[upload] finalize called
[upload] normalized
[store] setRaw
[upload] committed
[derive] Starting derivation
[derive] Derivation complete
[upload] derived
```

## **Error Scenarios**

1. **Missing required columns** → ErrorBanner with column list
2. **Empty file** → "No valid data found"
3. **Invalid file type** → "Invalid file type"
4. **File too large** → "File too large"
5. **Parse timeout** → Fallback to main thread
6. **Commit timeout** → "Parse finished but commit didn't run"

## **Performance Expectations**

- Small files (< 1MB): < 2 seconds
- Medium files (1-5MB): < 5 seconds  
- Large files (5-25MB): < 10 seconds
- Progress updates every 200ms
- UI remains responsive during parsing
