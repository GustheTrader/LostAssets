import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface Asset {
  id: number;
  owner_name: string;
  state: string;
  amount: number;
  company: string;
  location?: string;
  state_id?: string;
}

interface AssetDocumentGeneratorProps {
  asset: Asset;
  onClose?: () => void;
}

const RELATIONSHIP_OPTIONS = [
  { value: 'MYSELF', label: 'MYSELF (Owner is alive)' },
  { value: 'HEIR_INTESTATE', label: 'HEIR - INTESTATE (No will)' },
  { value: 'HEIR_WILL', label: 'HEIR - WILL (Executor)' },
  { value: 'HEIR_TRUST', label: 'HEIR - TRUST (Trustee)' },
  { value: 'HEIR_COURT', label: 'HEIR - COURT APPOINTED REP' },
];

export const AssetDocumentGenerator: React.FC<AssetDocumentGeneratorProps> = ({ asset, onClose }) => {
  const [relationship, setRelationship] = useState('HEIR_INTESTATE');
  const [heirName, setHeirName] = useState('');
  const [heirPhone, setHeirPhone] = useState('');
  const [heirEmail, setHeirEmail] = useState('');

  const isHeir = relationship.startsWith('HEIR');

  const generateDocument = () => {
    const docWindow = window.open('', '_blank');
    if (!docWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>CA Recovery Agreement - ${asset.owner_name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
          h1, h2 { color: #1a365d; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1a365d; padding-bottom: 15px; }
          .section { margin-bottom: 25px; }
          .signature { margin-top: 50px; width: 300px; border-top: 1px solid #000; padding-top: 8px; }
          .disclosure { font-size: 0.9em; background: #f8f9fa; padding: 15px; border-left: 4px solid #1a365d; }
          @media print { body { margin: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>California Unclaimed Property Recovery Agreement</h1>
          <h2>${isHeir ? 'For Heirs – Deceased Owner' : 'For Living Owner'}</h2>
          <p><strong>Sovereign Asset Recovery</strong><br>6024 Sweet Cherry Drive, Sparks, NV 89436</p>
        </div>

        <div class="section">
          <h3>Property Information</h3>
          <p><strong>Reported Owner:</strong> ${asset.owner_name}<br>
          <strong>Holder:</strong> ${asset.company}<br>
          <strong>Property Type:</strong> Checking Accounts<br>
          <strong>Amount:</strong> $${asset.amount.toFixed(2)}<br>
          <strong>Property ID:</strong> ${asset.state_id || 'N/A'}<br>
          <strong>State:</strong> ${asset.state}</p>
        </div>

        ${isHeir ? `
        <div class="section">
          <h3>Client / Heir Information</h3>
          <p>Name: ${heirName || '_______________________________'}<br>
          Phone: ${heirPhone || '________________'} &nbsp;&nbsp; Email: ${heirEmail || '________________'}</p>
        </div>
        ` : ''}

        <div class="section">
          <h3>Claimant Relationship</h3>
          <p><strong>${RELATIONSHIP_OPTIONS.find(r => r.value === relationship)?.label}</strong></p>
        </div>

        <div class="section">
          <h3>Services</h3>
          <p>Sovereign Asset Recovery will assist in preparing and submitting a claim for the above unclaimed property to the California State Controller’s Office.</p>
        </div>

        <div class="section">
          <h3>Compensation</h3>
          <p><strong>Maximum Legal Fee:</strong> 10% of recovered amount<br>
          <strong>Payment:</strong> Contingent — due only after funds are received. No upfront fees.</p>
        </div>

        <div class="section">
          <h3>Signatures</h3>
          <div class="signature">
            Client / Heir Signature: ________________________________ Date: ____________
          </div>
          <div class="signature" style="margin-top: 40px;">
            Sovereign Asset Recovery: ________________________________ Date: ____________
          </div>
        </div>

        <div class="disclosure">
          <strong>Important Disclosures:</strong><br>
          • You may claim this property yourself for free at https://www.sco.ca.gov/upd_contact.html<br>
          • Maximum legal finder fee in California is 10%.<br>
          • No payment is due until you receive the funds.
        </div>
      </body>
      </html>
    `;

    docWindow.document.write(html);
    docWindow.document.close();
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Generate California Recovery Documents</CardTitle>
        <p className="text-sm text-muted-foreground">
          {asset.owner_name} — ${asset.amount.toFixed(2)} ({asset.state})
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label>Claimant Relationship</Label>
          <Select value={relationship} onValueChange={setRelationship}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RELATIONSHIP_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isHeir && (
          <div className="space-y-4">
            <div>
              <Label>Heir / Client Full Name</Label>
              <Input 
                value={heirName} 
                onChange={(e) => setHeirName(e.target.value)} 
                placeholder="Full legal name of heir" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Phone</Label>
                <Input value={heirPhone} onChange={(e) => setHeirPhone(e.target.value)} />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={heirEmail} onChange={(e) => setHeirEmail(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button onClick={generateDocument} className="flex-1">
            Preview & Print to PDF
          </Button>
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Opens a clean printable document. Use browser Print → Save as PDF.
        </p>
      </CardContent>
    </Card>
  );
};
