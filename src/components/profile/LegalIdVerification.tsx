import React from 'react';
import { Shield, CheckCircle } from 'lucide-react';

interface LegalIdVerificationProps {
  isVerified: boolean;
  onVerify: () => void;
}

export function LegalIdVerification({ isVerified, onVerify }: LegalIdVerificationProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-3">
        <Shield className={`h-6 w-6 ${isVerified ? 'text-green-500' : 'text-gray-400'}`} />
        <div>
          <h3 className="font-medium">Legal ID Verification</h3>
          <p className="text-sm text-gray-500">
            {isVerified 
              ? 'Your identity has been verified'
              : 'Verify your identity to unlock all features'
            }
          </p>
        </div>
      </div>
      {isVerified ? (
        <span className="flex items-center text-green-500">
          <CheckCircle className="h-5 w-5 mr-1" />
          Verified
        </span>
      ) : (
        <button
          onClick={onVerify}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Verify Now
        </button>
      )}
    </div>
  );
}