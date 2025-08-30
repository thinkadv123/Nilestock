import { type WarehouseRow, type ShopifyRow } from '../types';

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
    const lowerCaseHeaders = headers.map(h => h.toLowerCase().trim());
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

    const warehouseData: any[] = XLSX.utils.sheet_to_json(warehouseWorkbook.Sheets[warehouseSheetName]);
    const shopifyData: any[] = XLSX.utils.sheet_to_json(shopifyWorkbook.Sheets[shopifySheetName]);

    if (warehouseData.length === 0 || shopifyData.length === 0) {
        throw new Error('One or both of the uploaded files are empty.');
    }

    // Find column names, allowing for case-insensitivity and whitespace
    const warehouseHeaders = Object.keys(warehouseData[0]);
    const shopifyHeaders = Object.keys(shopifyData[0]);

    const itemNumCol = findColumnName(warehouseHeaders, ["Item Number", "item number", "item_number"]);
    const barcodeCol = findColumnName(warehouseHeaders, ["Barcode", "barcode"]);
    const availablePhysicalCol = findColumnName(warehouseHeaders, ["Available Physical", "available physical", "available_physical"]);
    const skuCol = findColumnName(shopifyHeaders, ["Sku", "sku", "variant sku"]);
    const onHandCol = findColumnName(shopifyHeaders, ["On hand", "on hand", "on_hand", "inventory quantity", "Variant Inventory Qty", "Inventory Available", "Available", "On hand (current)"]);

    // Validate columns
    if ((!itemNumCol && !barcodeCol) || !availablePhysicalCol) {
      throw new Error('Warehouse file must contain "Available Physical" and either "Item Number" or "Barcode" columns.');
    }
    if (!skuCol || !onHandCol) {
      throw new Error('Shopify file must contain "Sku" and "On hand" columns.');
    }
    
    // Create a lookup map for efficient matching
    const warehouseMap = new Map<string, number>();
    for (const row of warehouseData as WarehouseRow[]) {
        const available = row[availablePhysicalCol];
        let quantity = 0;
        if (available != null) {
            // Robustly parse number: remove commas, handle non-numeric values
            const parsed = parseFloat(String(available).replace(/,/g, ''));
            if (!isNaN(parsed)) {
                quantity = parsed;
            }
        }

        // Add by Item Number if column exists
        if (itemNumCol) {
            const itemNumber = row[itemNumCol];
            const itemNumberStr = itemNumber != null ? String(itemNumber).trim() : '';
            if (itemNumberStr) {
                warehouseMap.set(itemNumberStr, quantity);
            }
        }

        // Add by Barcode if column exists
        if (barcodeCol) {
            const barcode = row[barcodeCol];
            const barcodeStr = barcode != null ? String(barcode).trim() : '';
            if (barcodeStr) {
                warehouseMap.set(barcodeStr, quantity);
            }
        }
    }

    // Process Shopify data
    let matchCount = 0;
    const updatedShopifyData = shopifyData.map((row: ShopifyRow) => {
      const sku = row[skuCol];
      const newRow = { ...row };

      if (sku != null) {
        const skuString = String(sku).trim();
        if (warehouseMap.has(skuString)) {
          newRow[onHandCol] = warehouseMap.get(skuString);
          matchCount++;
        }
      }
      return newRow;
    });
    
    if (matchCount === 0) {
        console.warn("No matches found between Shopify SKUs and Warehouse identifiers (Item Number/Barcode).");
    }

    // Generate and download the new Excel file
    const newWorksheet = XLSX.utils.json_to_sheet(updatedShopifyData);
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