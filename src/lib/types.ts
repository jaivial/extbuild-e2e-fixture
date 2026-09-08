export interface User {
  id: number;
  username: string;
  discord_id: number;
  discord_username: string;
  is_admin: boolean;
  role_points: number;
}

export interface OverviewStats {
  ok: boolean;
  paused: boolean;
  pause_reason: string;
  stats: {
    queued: number; running: number; awaiting_approval: number;
    awaiting_shards: number; integrating: number; done: number;
    failed: number; cancelled: number; total: number;
  };
  alerts: { level: string; text: string }[];
}

export interface InstanceMetrics {
  cpu?: { percent?: number; cores_logical?: number; load_avg?: number[] };
  memory?: { used_gb?: number; total_gb?: number; percent?: number };
  disk?: { used_gb?: number; total_gb?: number; percent?: number; free_gb?: number };
  gpu?: { name?: string; cores?: number };
  os?: { system?: string; release?: string; machine?: string; hostname?: string; mac_model?: string; mac_version?: string };
  uptime_seconds?: number;
}

export interface Instance {
  instance_id: string;
  role?: string;
  is_local?: boolean;
  online?: boolean;
  advertise_ip?: string;
  ip?: string;
  version?: string;
  in_flight?: number;
  capacity?: number;
  phase?: string;
  current_tasks?: (string | { id?: string; label?: string })[];
  metrics?: InstanceMetrics;
}

export interface Project {
  name: string;
  branch: string;
  detached: boolean;
  dirty: boolean;
  last_commit?: { sha: string; ts: number; subject: string } | null;
  updated_at?: string;
  status?: {
    open_pr_count?: number;
    pr?: { number?: number; url?: string; state?: string } | null;
    build?: { state?: string } | null;
    artifact?: unknown;
    manual_build_enabled?: boolean;
    links?: { count?: number; chat_linked?: boolean; pipeline_linked?: boolean };
  };
}

export interface UserRow {
  id: number;
  username: string;
  discord_username: string;
  is_admin: number;
  role_points: number;
  created_at: string;
  last_login_at: string | null;
  approval_status: string;
  active_sessions: number;
  github_connected: number;
  manageable?: boolean;
}

export interface ApprovalRequest {
  id?: number;
  token?: string;
  discord_username?: string;
  username?: string;
  requested_at?: string;
  note?: string;
}

export interface Gateway {
  instance: number;
  port: number;
  unit: string;
  systemd_active: boolean;
  responding: boolean;
  model_count: number;
  paused: boolean;
  email?: string;
  oauth_valid?: boolean;
  cached_models?: string[];
}

export interface Chat {
  id: number;
  title: string;
  status: string;
  kind: string;
  user_name: string;
  message_count: number;
  last_activity_at: string;
  last_message?: string;
  last_role?: string;
  guild_id?: string;
  channel_id?: string;
}

export interface ChatMessage {
  id: number;
  role: string;
  content: string;
  author?: string;
  created_at?: string;
}
