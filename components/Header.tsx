
import React from 'react';
import { SyncIcon } from './Icons';

export const Header: React.FC = () => {
    return (
        <header className="text-center mb-10">
            <div className="inline-flex items-center justify-center bg-sky-100 dark:bg-sky-900/50 rounded-full p-4 mb-4">
                <SyncIcon className="h-10 w-10 text-sky-600 dark:text-sky-400" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white">
                Nile Stock Inventory Sync Tool
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-600 dark:text-slate-400">
                Effortlessly update your Shopify 'On hand' inventory from a warehouse stock file.
            </p>
        </header>
    );
};