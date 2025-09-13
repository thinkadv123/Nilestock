
import React, { useState, useCallback } from 'react';
import { FileUpload } from './components/FileUpload';
import { Button } from './components/Button';
import { processAndDownloadFiles } from './services/fileProcessor';
import { Header } from './components/Header';
import { Instructions } from './components/Instructions';
// FIX: Removed the import for 'Download' as it is not exported from './components/Icons' and is not used in this component.
import { AlertTriangle, CheckCircle, Loader } from './components/Icons';

export default function App() {
  const [warehouseFile, setWarehouseFile] = useState<File | null>(null);
  const [shopifyFile, setShopifyFile] = useState<File | null>(null);
  const [processingState, setProcessingState] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleProcessFiles = useCallback(async () => {
    if (!warehouseFile || !shopifyFile) {
      setErrorMessage('Please upload both files before processing.');
      setProcessingState('error');
      return;
    }

    setProcessingState('processing');
    setErrorMessage('');

    try {
      await processAndDownloadFiles(warehouseFile, shopifyFile);
      setProcessingState('success');
      // Reset files after successful download
      setWarehouseFile(null);
      setShopifyFile(null);
      setTimeout(() => setProcessingState('idle'), 5000); // Reset status after 5s
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('An unknown error occurred during file processing.');
      }
      setProcessingState('error');
    }
  }, [warehouseFile, shopifyFile]);
  
  const isButtonDisabled = !warehouseFile || !shopifyFile || processingState === 'processing';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 flex flex-col items-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-3xl mx-auto">
        <Header />
        <Instructions />
        
        <main className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 sm:p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FileUpload
              id="warehouse-upload"
              label="Warehouse File"
              description='(.xlsx, .xls, .csv) with "Available Physical" and "Item Number" or "Barcode" columns.'
              file={warehouseFile}
              onFileChange={setWarehouseFile}
            />
            <FileUpload
              id="shopify-upload"
              label="Shopify File"
              description='(.xlsx, .xls, .csv) with "Sku" & "On hand" columns.'
              file={shopifyFile}
              onFileChange={setShopifyFile}
            />
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
            <Button onClick={handleProcessFiles} disabled={isButtonDisabled}>
              {processingState === 'processing' && <Loader className="animate-spin -ml-1 mr-3 h-5 w-5" />}
              {processingState === 'processing' ? 'Processing...' : 'Process & Download'}
            </Button>
          </div>

          {processingState === 'error' && errorMessage && (
            <div className="mt-6 flex items-start text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
              <AlertTriangle className="h-5 w-5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-semibold">Error</h3>
                <p className="text-sm">{errorMessage}</p>
              </div>
            </div>
          )}

          {processingState === 'success' && (
             <div className="mt-6 flex items-start text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <CheckCircle className="h-5 w-5 mr-3 flex-shrink-0" />
               <div>
                <h3 className="font-semibold">Success!</h3>
                <p className="text-sm">Your file "Shopify_Onhand_Updated.xlsx" has been downloaded.</p>
              </div>
            </div>
          )}
        </main>
        
        <footer className="text-center mt-8 text-sm text-slate-500 dark:text-slate-400">
          <p>&copy; {new Date().getFullYear()} Nile Stock Inventory Sync Tool. All rights reserved.</p>
          <p className="mt-1">
            Developed by <a href="http://www.thinkadv.com" target="_blank" rel="noopener noreferrer" className="text-sky-600 dark:text-sky-400 hover:underline">thinkadv</a>
          </p>
        </footer>
      </div>
    </div>
  );
}