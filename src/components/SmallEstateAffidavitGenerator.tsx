import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface SmallEstateAffidavitGeneratorProps {
  asset?: any;
}

export const SmallEstateAffidavitGenerator: React.FC<SmallEstateAffidavitGeneratorProps> = ({ asset }) => {
  const [formData, setFormData] = useState({
    decedentName: asset?.owner_name || '',
    dateOfDeath: '',
    county: '',
    affiantName: '',
    affiantRelationship: '',
    propertyDescription: asset ? `${asset.property_type || 'Checking Account'} at ${asset.company} - $${asset.amount}` : '',
  });

  const generateAffidavit = () => {
    const html = `
      <html>
        <head><title>Small Estate Affidavit - ${formData.decedentName}</title></head>
        <body style="font-family: Arial; padding: 40px; line-height: 1.6;">
          <h1 style="text-align:center">Affidavit for Collection of Personal Property</h1>
          <h2 style="text-align:center">(California Probate Code §§ 13100-13116)</h2>
          
          <p>I, <strong>${formData.affiantName}</strong>, being duly sworn, depose and say:</p>
          
          <p>1. The decedent, <strong>${formData.decedentName}</strong>, died on <strong>${formData.dateOfDeath}</strong> in the County of <strong>${formData.county}</strong>, State of California.</p>
          
          <p>2. At least 40 days have elapsed since the death of the decedent.</p>
          
          <p>3. The decedent's personal property subject to this affidavit does not exceed $208,850 in value.</p>
          
          <p>4. The property described below is: <strong>${formData.propertyDescription}</strong></p>
          
          <p>5. I am the successor in interest of the decedent and am entitled to collect this property.</p>
          
          <div style="margin-top:60px">
            <p>_______________________________________________</p>
            <p>Affiant Signature &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Date: ______________</p>
          </div>
          
          <p style="margin-top:40px"><strong>Notary Acknowledgment</strong></p>
          <p style="border:1px solid #000; padding:20px; height:120px;"></p>
        </body>
      </html>
    `;
    
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Small Estate Affidavit Generator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Decedent Full Name</Label>
            <Input value={formData.decedentName} onChange={e => setFormData({...formData, decedentName: e.target.value})} />
          </div>
          <div>
            <Label>Date of Death</Label>
            <Input type="date" value={formData.dateOfDeath} onChange={e => setFormData({...formData, dateOfDeath: e.target.value})} />
          </div>
        </div>

        <div>
          <Label>County of Death</Label>
          <Input value={formData.county} onChange={e => setFormData({...formData, county: e.target.value})} placeholder="e.g. Los Angeles" />
        </div>

        <div>
          <Label>Affiant (Your) Full Name</Label>
          <Input value={formData.affiantName} onChange={e => setFormData({...formData, affiantName: e.target.value})} />
        </div>

        <div>
          <Label>Property Description</Label>
          <Input value={formData.propertyDescription} onChange={e => setFormData({...formData, propertyDescription: e.target.value})} />
        </div>

        <Button onClick={generateAffidavit} className="w-full">
          Generate & Print Small Estate Affidavit
        </Button>
      </CardContent>
    </Card>
  );
};
