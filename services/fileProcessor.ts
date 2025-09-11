
declare const XLSX: any; // Using XLSX from CDN

const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
};

const findColumnName = (headers: string[], possibleNames: string[]): string | undefined => {
    const lowerCaseHeaders = headers.map(h => String(h).toLowerCase().trim());
    for (const name of possibleNames) {
        const lowerCaseName = name.toLowerCase().trim();
        const index = lowerCaseHeaders.indexOf(lowerCaseName);
        if (index !== -1) {
            return headers[index]; // Return the original case header
        }
    }
    return undefined;
};


export const processAndDownloadFiles = async (warehouseFile: File, shopifyFile: File) => {
  if (typeof XLSX === 'undefined') {
    throw new Error('File processing library (XLSX) is not available. Please check your internet connection.');
  }
  
  try {
    const [warehouseBuffer, shopifyBuffer] = await Promise.all([
      readFileAsArrayBuffer(warehouseFile),
      readFileAsArrayBuffer(shopifyFile),
    ]);

    // Parse files
    const warehouseWorkbook = XLSX.read(warehouseBuffer, { type: 'array' });
    const shopifyWorkbook = XLSX.read(shopifyBuffer, { type: 'array' });

    const warehouseSheetName = warehouseWorkbook.SheetNames[0];
    const shopifySheetName = shopifyWorkbook.SheetNames[0];

    const warehouseSheet = warehouseWorkbook.Sheets[warehouseSheetName];
    const shopifySheet = shopifyWorkbook.Sheets[shopifySheetName];
    
    // Read Shopify data as an array of arrays to preserve structure and empty columns
    const shopifyDataAsArrays: any[][] = XLSX.utils.sheet_to_json(shopifySheet, { header: 1, defval: null });

    if (shopifyDataAsArrays.length === 0) {
        throw new Error('Shopify file is empty.');
    }
    
    // Extract headers and rows
    const shopifyHeadersOriginal = shopifyDataAsArrays[0].map(h => h === null ? '' : String(h));
    const headerLength = shopifyHeadersOriginal.length;
    const shopifyRows = shopifyDataAsArrays.slice(1);
    
    const warehouseData: any[] = XLSX.utils.sheet_to_json(warehouseSheet);

    if (warehouseData.length === 0) {
        throw new Error('The warehouse file is empty.');
    }
    
    // Find column names for warehouse file
    const warehouseHeaders = Object.keys(warehouseData[0]);
    const itemNumCol = findColumnName(warehouseHeaders, ["Item Number", "item number", "item_number"]);
    const barcodeCol = findColumnName(warehouseHeaders, ["Barcode", "barcode"]);
    const availablePhysicalCol = findColumnName(warehouseHeaders, ["Available Physical", "available physical", "available_physical"]);

    // Find column names and indices for Shopify file
    const skuColName = findColumnName(shopifyHeadersOriginal, ["SKU", "Sku", "sku", "variant sku"]);
    const onHandColName = findColumnName(shopifyHeadersOriginal, ["On hand (new)", "On hand", "on hand", "on_hand", "inventory quantity", "Variant Inventory Qty", "Inventory Available", "Available", "On hand (current)"]);

    // Validate columns
    if ((!itemNumCol && !barcodeCol) || !availablePhysicalCol) {
      throw new Error('Warehouse file must contain "Available Physical" and either "Item Number" or "Barcode" columns.');
    }
    if (!skuColName || !onHandColName) {
      throw new Error('Shopify file must contain "SKU" and an inventory column like "On hand (new)" or "On hand".');
    }
    
    const skuColIndex = shopifyHeadersOriginal.indexOf(skuColName);
    const onHandColIndex = shopifyHeadersOriginal.indexOf(onHandColName);
    
    // Create a lookup map for efficient matching
    const warehouseMap = new Map<string, number>();
    for (const row of warehouseData) {
        const available = row[availablePhysicalCol];
        let quantity = 0;
        if (available != null) {
            const parsed = parseFloat(String(available).replace(/,/g, ''));
            if (!isNaN(parsed)) {
                quantity = parsed;
            }
        }

        if (itemNumCol) {
            const itemNumber = row[itemNumCol];
            const itemNumberStr = itemNumber != null ? String(itemNumber).trim() : '';
            if (itemNumberStr) {
                warehouseMap.set(itemNumberStr, quantity);
            }
        }

        if (barcodeCol) {
            const barcode = row[barcodeCol];
            const barcodeStr = barcode != null ? String(barcode).trim() : '';
            if (barcodeStr) {
                warehouseMap.set(barcodeStr, quantity);
            }
        }
    }

    // Process Shopify data by updating the inventory in the specific column index
    let matchCount = 0;
    const updatedShopifyRows = shopifyRows.map((row: any[]) => {
      // Create a new row array and pad it to ensure it has the same length as the header row.
      // This prevents trailing empty columns from being dropped.
      const newRow = [...row];
      while (newRow.length < headerLength) {
        newRow.push(null);
      }
      // Also truncate if a row is somehow longer than the header.
      if (newRow.length > headerLength) {
        newRow.length = headerLength;
      }
      
      const sku = newRow[skuColIndex];

      if (sku != null) {
        const skuString = String(sku).trim();
        if (warehouseMap.has(skuString)) {
          newRow[onHandColIndex] = warehouseMap.get(skuString);
          matchCount++;
        }
      }
      return newRow;
    });
    
    if (matchCount === 0) {
        console.warn("No matches found between Shopify SKUs and Warehouse identifiers (Item Number/Barcode).");
    }

    // Combine original headers and updated rows
    const finalDataForSheet = [shopifyHeadersOriginal, ...updatedShopifyRows];

    // Generate the new Excel file from the array of arrays
    const newWorksheet = XLSX.utils.aoa_to_sheet(finalDataForSheet);
    const newWorkbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Updated Inventory');

    // Create a Blob and trigger download
    const excelBuffer = XLSX.write(newWorkbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(data);
    link.download = 'Shopify_Onhand_Updated.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

  } catch (err) {
    console.error('File processing failed:', err);
    if (err instanceof Error) {
        throw err;
    }
    throw new Error('An unexpected error occurred while processing the files.');
  }
};
