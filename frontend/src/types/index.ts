export interface User {
  id: number;
  name: string;
  email: string;
  role: 'resident' | 'admin';
  flat_number?: string;
  tower?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Complaint {
  id: number;
  complaint_id: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'normal' | 'urgent' | 'emergency';
  recommended_priority?: string;
  status: 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed' | 'reopened';
  tower?: string;
  flat_number?: string;
  residents_affected: number;
  photo_url?: string;
  resident_id: number;
  assigned_staff_id?: number;
  admin_notes?: string;
  due_date?: string;
  resolved_at?: string;
  is_overdue: boolean;
  is_recurring: boolean;
  created_at: string;
  updated_at: string;
}

export interface ComplaintHistory {
  id: number;
  field_changed: string;
  old_value?: string;
  new_value?: string;
  note?: string;
  changed_by_id: number;
  created_at: string;
}

export interface Feedback {
  id: number;
  rating: number;
  comment?: string;
  created_at: string;
}

export interface ComplaintDetail extends Complaint {
  history: ComplaintHistory[];
  feedback?: Feedback;
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  link?: string;
  is_read: boolean;
  created_at: string;
}

export interface Notice {
  id: number;
  title: string;
  content: string;
  category: string;
  is_pinned: boolean;
  created_by_id: number;
  valid_until?: string;
  created_at: string;
}

export interface Staff {
  id: number;
  name: string;
  department: string;
  phone?: string;
  email?: string;
  is_available: boolean;
  current_workload: number;
  created_at: string;
}

export interface SLASetting {
  id: number;
  priority: string;
  resolution_hours: number;
  warning_threshold_pct: number;
}

export interface AuditLog {
  id: number;
  user_id?: number;
  action: string;
  resource_type?: string;
  resource_id?: number;
  details?: string;
  created_at: string;
}

export interface AdminDashboard {
  stats: {
    total: number;
    open: number;
    assigned: number;
    in_progress: number;
    resolved: number;
    closed: number;
    overdue: number;
  };
  health_score: {
    score: number;
    grade: string;
    breakdown: Record<string, number>;
    component_scores: Record<string, number>;
  };
  avg_resolution_hours: number;
  sla_compliance_pct: number;
  satisfaction_avg: number;
  by_category: Array<{ category: string; count: number }>;
  by_status: Array<{ status: string; count: number }>;
  by_tower: Array<{ tower: string; count: number }>;
  trend_30d: Array<{ date: string; count: number }>;
  priority_distribution: Array<{ priority: string; count: number }>;
}

export interface Amenity {
  id: number;
  name: string;
  description?: string;
  hourly_fee: number;
  max_daily_hours_per_flat: number;
  capacity: number;
  open_time?: string;
  close_time?: string;
  is_active: boolean;
  created_at: string;
}

export interface ProfileUpdateRequest {
  id: number;
  user_id: number;
  user_name?: string;
  user_email?: string;
  old_name?: string;
  new_name?: string;
  old_flat_number?: string;
  new_flat_number?: string;
  old_tower?: string;
  new_tower?: string;
  old_phone?: string;
  new_phone?: string;
  status: 'pending_admin' | 'awaiting_resident_confirmation' | 'applied' | 'rejected' | 'cancelled';
  admin_note?: string;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: number;
  amenity_id: number;
  resident_id: number;
  start_time: string;
  end_time: string;
  total_fee: number;
  status: 'approved' | 'flagged_conflict' | 'cancelled';
  is_flagged?: boolean;
  conflict_note?: string;
  auto_allotted?: boolean;
  created_at: string;
}

export interface BookingDetailed extends Booking {
  amenity: Amenity;
  resident: {
    id: number;
    name: string;
    email: string;
    flat_number?: string;
    tower?: string;
    phone?: string;
  };
}

export interface AmenityAnalytics30d {
  amenity_id: number;
  name: string;
  hourly_fee: number;
  capacity: number;
  is_active: boolean;
  max_daily_hours_per_flat: number;
  total_bookings_30d: number;
  total_hours_30d: number;
  total_revenue_30d: number;
  approved_count: number;
  cancelled_count: number;
  flagged_conflict_count: number;
  utilization_rate_pct: number;
  daily_trend: Array<{ date: string; count: number; revenue: number }>;
}

export interface AmenityLog {
  id: number;
  action: string;
  timestamp: string;
  resident_name: string;
  flat_number?: string;
  tower?: string;
  resource_id?: number;
  resource_type?: string;
  details: string;
}

export interface VisitorPass {
  id: number;
  pass_code: string;
  visitor_name: string;
  visitor_phone: string;
  visitor_type: 'guest' | 'delivery' | 'cab' | 'daily_help' | 'service';
  purpose?: string;
  vehicle_number?: string;
  resident_id: number;
  flat_number?: string;
  tower?: string;
  valid_from: string;
  valid_until: string;
  status: 'approved' | 'checked_in' | 'checked_out' | 'expired' | 'cancelled';
  entry_time?: string;
  exit_time?: string;
  created_at: string;
  resident_name?: string;
}

export interface PassQuotaInfo {
  used: number;
  limit: number;
  remaining: number;
  is_exhausted: boolean;
  period: 'daily' | 'active';
  label: string;
}

export interface PassQuotaStatus {
  guest: PassQuotaInfo;
  service: PassQuotaInfo;
  daily_help: PassQuotaInfo;
  delivery: PassQuotaInfo;
  cab: PassQuotaInfo;
}


