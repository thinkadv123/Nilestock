
import React from 'react';
import { CheckCircle } from './Icons';

const instructions = [
    { text: 'Upload your Warehouse inventory file.' },
    { text: 'Upload your Shopify product export file.' },
    { text: 'Click "Process & Download" to sync inventory.' },
    { text: 'Import the downloaded file back into Shopify.' }
];

export const Instructions: React.FC = () => {
    return (
        <div className="mb-8 bg-sky-50 dark:bg-slate-800/50 border border-sky-200 dark:border-sky-900/50 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">How it works:</h2>
            <ul className="space-y-2">
                {instructions.map((item, index) => (
                    <li key={index} className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-sky-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-slate-600 dark:text-slate-400">{item.text}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};
