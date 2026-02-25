export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMembership {
  id: string;
  user_id: string;
  organization_id: string;
  role: 'platform_admin' | 'org_owner' | 'park_manager' | 'marketing' | 'support_agent';
  created_at: string;
}

export interface OperatorProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParkSelection {
  id: string;
  name: string;
  slug: string;
}

export interface SupportTicket {
  id: string;
  organization_id: string;
  created_by: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  updated_at: string;
}

export interface HealthEvent {
  id: string;
  event_type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  created_at: string;
}
