/**
 * Module declarations for external packages
 * Helps with TypeScript module resolution issues
 */

import type {
  SupabaseClient as CoreSupabaseClient,
  SupabaseSession,
  SupabaseUser,
  StringKeyObject
} from './core';

declare module 'lucide-react' {
  import { FC, SVGProps } from 'react';
  
  export interface IconProps extends SVGProps<SVGSVGElement> {
    size?: string | number;
  }
  
  export const ArrowLeft: FC<IconProps>;
  export const Download: FC<IconProps>;
  export const Share2: FC<IconProps>;
  export const Calendar: FC<IconProps>;
  export const DollarSign: FC<IconProps>;
  export const TrendingUp: FC<IconProps>;
  export const TrendingDown: FC<IconProps>;
  export const Minus: FC<IconProps>;
  export const FileText: FC<IconProps>;
  export const Calculator: FC<IconProps>;
  export const AlertCircle: FC<IconProps>;
  export const CheckCircle: FC<IconProps>;
  export const ChevronDown: FC<IconProps>;
  export const Check: FC<IconProps>;
  export const User: FC<IconProps>;
  export const Mail: FC<IconProps>;
  export const Save: FC<IconProps>;
  export const Eye: FC<IconProps>;
  export const EyeOff: FC<IconProps>;
  export const Lock: FC<IconProps>;
  export const Settings: FC<IconProps>;
  export const Bell: FC<IconProps>;
  export const BarChart: FC<IconProps>;
  export const Shield: FC<IconProps>;
  export const RefreshCw: FC<IconProps>;
  export const Upload: FC<IconProps>;
  export const ChevronRight: FC<IconProps>;
  export const ChevronLeft: FC<IconProps>;
  export const ArrowRight: FC<IconProps>;
  export const Loader2: FC<IconProps>;
  export const X: FC<IconProps>;
  export const File: FC<IconProps>;
  export const Plus: FC<IconProps>;
  export const Zap: FC<IconProps>;
  export const Search: FC<IconProps>;
  export const BarChart3: FC<IconProps>;
  
  // Missing icons from error messages
  export const XCircle: FC<IconProps>;
  export const LogIn: FC<IconProps>;
  export const UserPlus: FC<IconProps>;
  export const Trash2: FC<IconProps>;
  export const Filter: FC<IconProps>;
  export const LogOut: FC<IconProps>;
  export const Share: FC<IconProps>;
  export const Edit2: FC<IconProps>;
  export const Home: FC<IconProps>;
  export const FileSearch: FC<IconProps>;
  export const History: FC<IconProps>;
  export const Sun: FC<IconProps>;
  export const Moon: FC<IconProps>;
  export const Activity: FC<IconProps>;
  export const Target: FC<IconProps>;
  export const Percent: FC<IconProps>;
  export const Clock: FC<IconProps>;
  export const FileQuestion: FC<IconProps>;
  export const Database: FC<IconProps>;
  export const UserCheck: FC<IconProps>;
  export const Globe: FC<IconProps>;
  export const Users: FC<IconProps>;
  export type LucideIcon = FC<IconProps>;
  export const Info: FC<IconProps>;
  export const AlertTriangle: FC<IconProps>;
  export const Printer: FC<IconProps>;
  export const Circle: FC<IconProps>;
}

declare module '@supabase/supabase-js' {
  export type Session = SupabaseSession;
  
  export type User = SupabaseUser;
  
  export type SupabaseClient = CoreSupabaseClient;
  
  export function createClient(url: string, key: string, options?: StringKeyObject): SupabaseClient;
}

declare global {
  interface Window {
    pdfjsLib: import('./core').PDFJSLib;
  }
}