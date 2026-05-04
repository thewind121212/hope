"use client";

import { useState } from 'react';
import { Copy, Download, Printer } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { toast } from 'sonner';

interface RecoveryCodeDisplayProps {
  codes: string[];
  onConfirmed: () => void;
  onCancel?: () => void;
}

export function RecoveryCodeDisplay({
  codes,
  onConfirmed,
  onCancel
}: RecoveryCodeDisplayProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const copyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
      toast.success('Code copied to clipboard');
    });
  };

  const downloadCodes = () => {
    const text = `Simple Bookmark Recovery Codes\n\nGenerated: ${new Date().toLocaleString()}\n\nIMPORTANT: Save these codes in a safe location.\nEach code can be used once to regain access if you forget your passphrase.\nTreat them like passwords.\n\n${codes.map((code, i) => `${i + 1}. ${code}`).join('\n')}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vault-recovery-codes-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success('Recovery codes downloaded');
  };

  const printCodes = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Could not open print window');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Simple Bookmark Recovery Codes</title>
        <style>
          body { font-family: monospace; padding: 20px; }
          h1 { margin-bottom: 20px; }
          .warning { color: red; font-weight: bold; margin-bottom: 20px; }
          .code { margin: 10px 0; padding: 10px; background: #f0f0f0; border-radius: 4px; }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <h1>Simple Bookmark Recovery Codes</h1>
        <p class="warning">⚠️ KEEP THESE CODES SAFE! Each code can be used once to regain access to your vault.</p>
        <p>Generated: ${new Date().toLocaleString()}</p>
        ${codes.map((code, i) => `<div class="code">${i + 1}. ${code}</div>`).join('')}
        <div class="footer">
          <p>Do not share these codes with anyone. Store them securely.</p>
          <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
    toast.success('Opening print dialog...');
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800">
        <h3 className="font-semibold text-red-900 dark:text-red-200 mb-2">⚠️ Save Your Recovery Codes</h3>
        <p className="text-sm text-red-800 dark:text-red-300">
          These codes allow you to regain access to your vault if you forget your passphrase. Each code can be used once.
          <br />
          <strong>You will not see these codes again.</strong> Store them securely (safe, password manager, or print).
        </p>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {codes.map((code, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700"
          >
            <span className="font-mono text-sm font-semibold text-gray-900 dark:text-slate-100">
              {code}
            </span>
            <button
              onClick={() => copyCode(code, index)}
              className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded transition-colors"
              title="Copy code"
            >
              <Copy
                size={16}
                className={copiedIndex === index ? 'text-green-600' : 'text-gray-600 dark:text-slate-400'}
              />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Button
          onClick={downloadCodes}
          variant="secondary"
          className="flex items-center gap-2"
        >
          <Download size={18} />
          Download
        </Button>
        <Button
          onClick={printCodes}
          variant="secondary"
          className="flex items-center gap-2"
        >
          <Printer size={18} />
          Print
        </Button>
      </div>

      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="confirmed"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-1 w-4 h-4 cursor-pointer"
        />
        <label htmlFor="confirmed" className="text-sm text-gray-700 dark:text-slate-300 cursor-pointer flex-1">
          I have securely saved my recovery codes and understand they are as important as my passphrase.
        </label>
      </div>

      <div className="flex gap-3">
        {onCancel && (
          <Button onClick={onCancel} variant="secondary" className="flex-1">
            Cancel
          </Button>
        )}
        <Button
          onClick={() => {
            if (!confirmed) {
              toast.error('Please confirm you have saved your recovery codes');
              return;
            }
            onConfirmed();
          }}
          disabled={!confirmed}
          className="flex-1"
        >
          Continue & Enable Vault
        </Button>
      </div>
    </div>
  );
}
