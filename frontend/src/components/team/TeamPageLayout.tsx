import React from 'react';
import { Shield, Users } from 'lucide-react';

interface TeamPageLayoutProps {
  organizationName: string;
  userRole: string;
  children: React.ReactNode;
}

export function TeamPageLayout({ organizationName, userRole, children }: TeamPageLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Team Management</h1>
          </div>
          
          <div className="flex items-center gap-4 text-muted-foreground">
            <p className="text-lg">{organizationName}</p>
            <div className="flex items-center gap-1.5">
              <Shield className="w-4 h-4" />
              <span className="text-sm capitalize">{userRole}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        {children}
      </div>
    </div>
  );
}