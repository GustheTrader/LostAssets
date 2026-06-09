import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';

interface CAProbateSmallEstateProps {
  assetAmount?: number;
}

export const CAProbateSmallEstate: React.FC<CAProbateSmallEstateProps> = ({ assetAmount }) => {
  const [showChecklist, setShowChecklist] = useState(false);

  // Current California Small Estate Limits (as of 2026)
  const limits = {
    personalProperty: 208850,      // On or after April 1, 2025
    realPropertyHomestead: 750000, // Main residence only (new 2025 rule)
    previousLimit: 184500,         // Reference to ~$184K the user mentioned
  };

  const isOverSmallEstate = assetAmount ? assetAmount > limits.personalProperty : false;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">California Probate & Small Estate</h1>
          <p className="text-muted-foreground">Unclaimed Property Heir Claims – 2026 Rules</p>
        </div>
        <Badge variant={isOverSmallEstate ? "destructive" : "default"}>
          {isOverSmallEstate ? "Full Probate Likely Required" : "Small Estate Affidavit Possible"}
        </Badge>
      </div>

      <Alert>
        <AlertDescription>
          <strong>Current Limits (Deaths on/after April 1, 2025):</strong><br />
          • Personal Property Small Estate: <strong>${limits.personalProperty.toLocaleString()}</strong><br />
          • Homestead Real Property: <strong>${limits.realPropertyHomestead.toLocaleString()}</strong> (primary residence only)
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Small Estate Path */}
        <Card>
          <CardHeader>
            <CardTitle className="text-green-700">Small Estate Affidavit (No Probate)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">
              If total personal property ≤ <strong>${limits.personalProperty.toLocaleString()}</strong>, heirs can use a simple affidavit instead of full probate.
            </p>
            <ul className="text-sm space-y-1 list-disc pl-5">
              <li>Probate Code §§ 13100–13116</li>
              <li>Requires notarized Small Estate Affidavit (Form DE-305 or equivalent)</li>
              <li>Death certificate + proof of heirship</li>
              <li>Can be used for unclaimed property claims</li>
            </ul>
            <Button 
              variant="outline" 
              onClick={() => setShowChecklist(!showChecklist)}
              className="w-full"
            >
              {showChecklist ? 'Hide' : 'Show'} Document Checklist
            </Button>
          </CardContent>
        </Card>

        {/* Full Probate Path */}
        <Card>
          <CardHeader>
            <CardTitle className="text-red-700">Full Probate Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">
              If personal property exceeds <strong>${limits.personalProperty.toLocaleString()}</strong>, full probate is generally required.
            </p>
            <ul className="text-sm space-y-1 list-disc pl-5">
              <li>Petition for Probate (Form GC-210)</li>
              <li>Appoint Personal Representative / Executor</li>
              <li>Notice to creditors & heirs</li>
              <li>Inventory & Appraisal</li>
              <li>Final accounting and distribution</li>
            </ul>
            <div className="text-xs text-muted-foreground">
              Time: 6–18 months typical | Cost: $5,000–$15,000+
            </div>
          </CardContent>
        </Card>
      </div>

      {showChecklist && (
        <Card>
          <CardHeader>
            <CardTitle>Small Estate Affidavit – Required Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Mandatory:</strong>
                <ul className="mt-2 space-y-1 list-disc pl-5">
                  <li>Certified Death Certificate</li>
                  <li>Small Estate Affidavit (notarized)</li>
                  <li>Government-issued ID of affiant</li>
                  <li>Proof of heirship (birth/marriage certificate, etc.)</li>
                </ul>
              </div>
              <div>
                <strong>Recommended:</strong>
                <ul className="mt-2 space-y-1 list-disc pl-5">
                  <li>Affidavit of Heirship (if intestate)</li>
                  <li>Letters of Administration (if probated)</li>
                  <li>Trust documents (if applicable)</li>
                  <li>Bank statements or property description</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Automation Opportunities (Next Steps)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>✅ Auto-detect when asset amount triggers full probate vs small estate</div>
          <div>✅ Generate pre-filled Small Estate Affidavit (DE-305 style)</div>
          <div>✅ Generate cover letter to California State Controller’s Office</div>
          <div>✅ Track heir documents and claim status</div>
          <div>⏳ Future: Auto-generate GC-210 petition for assets over limit</div>
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground">
        Source: California Courts Self-Help, Probate Code §§ 13000–13116, AB 2016 (2025 updates)
      </div>
    </div>
  );
};
