export interface LandingConfig {
  landingHeadline: string;
  landingSubheadline: string;
  offerLink: string;
  driveLink: string;
  platformName: string;
  platformKeywords: string;
  referenceImageUrl?: string;
  referenceImageEnabled?: string;
}

export interface VerificationResult {
  verified: boolean;
  confidence: number;
  reason: string;
  extractedText?: string;
  emailFound?: string;
  platformDetected?: string;
  dateFound?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

import 'next-auth';

declare module 'next-auth' {
  interface User {
    role?: string;
    status?: string;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      role: string;
      status: string;
      name?: string | null;
    };
  }
}
