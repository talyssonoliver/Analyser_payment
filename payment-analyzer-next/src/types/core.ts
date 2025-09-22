/**
 * Core Type Definitions
 * Central location for all application type definitions
 */

// =============================================================================
// PDF Processing Types
// =============================================================================

/**
 * PDF.js Text Content Item Interface
 */
export interface PDFTextContentItem {
  str: string;
  dir: string;
  width: number;
  height: number;
  transform: number[];
  fontName: string;
  hasEOL?: boolean;
}

/**
 * PDF.js Text Content Interface
 */
export interface PDFTextContent {
  items: PDFTextContentItem[];
  styles: Record<string, unknown>;
}

/**
 * PDF.js Page Interface
 */
export interface PDFPage {
  pageNumber: number;
  getTextContent(): Promise<PDFTextContent>;
  render(renderContext: unknown): PDFRenderTask;
  getViewport(parameters: { scale: number }): PDFPageViewport;
}

/**
 * PDF.js Document Interface
 */
export interface PDFDocument {
  numPages: number;
  getPage(pageNumber: number): Promise<PDFPage>;
  getMetadata(): Promise<PDFMetadata>;
  destroy(): void;
}

/**
 * PDF.js Document Loading Task
 */
export interface PDFDocumentLoadingTask {
  promise: Promise<PDFDocument>;
  destroy(): void;
}

/**
 * PDF.js Render Task Interface
 */
export interface PDFRenderTask {
  promise: Promise<void>;
  cancel(): void;
}

/**
 * PDF.js Page Viewport Interface
 */
export interface PDFPageViewport {
  width: number;
  height: number;
  scale: number;
  rotation: number;
  transform: number[];
}

/**
 * PDF.js Metadata Interface
 */
export interface PDFMetadata {
  info: {
    Title?: string;
    Author?: string;
    Subject?: string;
    Creator?: string;
    Producer?: string;
    CreationDate?: string;
    ModDate?: string;
  };
  metadata: unknown;
}

/**
 * PDF.js Library Interface
 */
export interface PDFJSLib {
  getDocument(data: ArrayBuffer | Uint8Array | string): PDFDocumentLoadingTask;
  version: string;
  build: string;
  disableWorker: boolean;
  workerSrc: string;
}

/**
 * Parsed PDF Page Data
 */
export interface ParsedPDFPageData {
  pageNumber: number;
  text: string;
  extractedData?: Record<string, unknown>;
}

/**
 * Complete PDF Parse Result
 */
export interface ParsedPDFData {
  text: string;
  pages: ParsedPDFPageData[];
  metadata?: {
    title?: string;
    author?: string;
    creator?: string;
    producer?: string;
    creationDate?: Date;
    modificationDate?: Date;
  };
}

/**
 * Generic PDF Parse Result with Success/Error
 */
export interface PDFParseResult<T = Record<string, unknown>> {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
  rawData: ParsedPDFData;
}

// =============================================================================
// Supabase Types
// =============================================================================

/**
 * Supabase Auth Session
 */
export interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  token_type: string;
  user: SupabaseUser;
}

/**
 * Supabase User
 */
export interface SupabaseUser {
  id: string;
  email?: string;
  email_confirmed_at?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
  aud: string;
  role?: string;
}

/**
 * Supabase Auth Response
 */
export interface SupabaseAuthResponse<T = SupabaseSession> {
  data: {
    session: T | null;
    user?: SupabaseUser | null;
  };
  error: SupabaseError | null;
}

/**
 * Supabase Error
 */
export interface SupabaseError {
  message: string;
  status?: number;
  details?: string;
  hint?: string;
  code?: string;
}

/**
 * Supabase Query Builder Interface
 */
export interface SupabaseQueryBuilder {
  select(columns?: string): SupabaseQueryBuilder;
  insert(values: Record<string, unknown> | Record<string, unknown>[]): SupabaseQueryBuilder;
  update(values: Record<string, unknown>): SupabaseQueryBuilder;
  delete(): SupabaseQueryBuilder;
  eq(column: string, value: unknown): SupabaseQueryBuilder;
  neq(column: string, value: unknown): SupabaseQueryBuilder;
  gt(column: string, value: unknown): SupabaseQueryBuilder;
  gte(column: string, value: unknown): SupabaseQueryBuilder;
  lt(column: string, value: unknown): SupabaseQueryBuilder;
  lte(column: string, value: unknown): SupabaseQueryBuilder;
  like(column: string, pattern: string): SupabaseQueryBuilder;
  ilike(column: string, pattern: string): SupabaseQueryBuilder;
  in(column: string, values: unknown[]): SupabaseQueryBuilder;
  is(column: string, value: unknown): SupabaseQueryBuilder;
  order(column: string, options?: { ascending?: boolean }): SupabaseQueryBuilder;
  range(from: number, to: number): SupabaseQueryBuilder;
  limit(count: number): SupabaseQueryBuilder;
  single(): SupabaseQueryBuilder;
  maybeSingle(): SupabaseQueryBuilder;
  then<TResult1 = SupabaseResponse, TResult2 = never>(
    onfulfilled?: ((value: SupabaseResponse) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): Promise<TResult1 | TResult2>;
}

/**
 * Supabase Response
 */
export interface SupabaseResponse<T = Record<string, unknown>[] | Record<string, unknown> | null> {
  data: T;
  error: SupabaseError | null;
  count?: number;
  status: number;
  statusText: string;
}

/**
 * Supabase Auth Methods
 */
export interface SupabaseAuth {
  getSession(): Promise<SupabaseAuthResponse<SupabaseSession>>;
  getUser(): Promise<SupabaseAuthResponse<SupabaseUser>>;
  signInWithPassword(credentials: {
    email: string;
    password: string;
  }): Promise<SupabaseAuthResponse<SupabaseSession>>;
  signUp(credentials: {
    email: string;
    password: string;
    options?: {
      data?: Record<string, unknown>;
      captchaToken?: string;
      emailRedirectTo?: string;
    };
  }): Promise<SupabaseAuthResponse<SupabaseSession>>;
  signOut(): Promise<SupabaseAuthResponse<never>>;
  resetPasswordForEmail(email: string, options?: {
    redirectTo?: string;
    captchaToken?: string;
  }): Promise<SupabaseAuthResponse<never>>;
  updateUser(attributes: {
    email?: string;
    password?: string;
    data?: Record<string, unknown>;
  }): Promise<SupabaseAuthResponse<SupabaseUser>>;
  onAuthStateChange(
    callback: (event: string, session: SupabaseSession | null) => void
  ): {
    data: { subscription: { unsubscribe: () => void } };
  };
}

/**
 * Supabase Storage Interface
 */
export interface SupabaseStorage {
  from(bucketId: string): SupabaseStorageBucket;
  createBucket(id: string, options?: Record<string, unknown>): Promise<SupabaseResponse>;
  getBucket(id: string): Promise<SupabaseResponse>;
  listBuckets(): Promise<SupabaseResponse>;
  updateBucket(id: string, options: Record<string, unknown>): Promise<SupabaseResponse>;
  deleteBucket(id: string): Promise<SupabaseResponse>;
}

/**
 * Supabase Storage Bucket Interface
 */
export interface SupabaseStorageBucket {
  upload(path: string, fileBody: File | Blob | ArrayBuffer, options?: {
    cacheControl?: string;
    contentType?: string;
    upsert?: boolean;
  }): Promise<SupabaseResponse<{ path: string }>>;
  download(path: string): Promise<SupabaseResponse<Blob>>;
  list(path?: string, options?: {
    limit?: number;
    offset?: number;
    sortBy?: { column: string; order: string };
  }): Promise<SupabaseResponse<unknown[]>>;
  remove(paths: string[]): Promise<SupabaseResponse<unknown[]>>;
  createSignedUrl(path: string, expiresIn: number): Promise<SupabaseResponse<{ signedUrl: string }>>;
  createSignedUrls(paths: string[], expiresIn: number): Promise<SupabaseResponse<{ signedUrl: string; path: string }[]>>;
  getPublicUrl(path: string): { data: { publicUrl: string } };
}

/**
 * Complete Supabase Client Interface
 */
export interface SupabaseClient {
  from(table: string): SupabaseQueryBuilder;
  auth: SupabaseAuth;
  storage: SupabaseStorage;
  channel(name?: string): unknown;
  getChannels(): unknown[];
  removeAllChannels(): Promise<void>;
  removeChannel(channel: unknown): Promise<void>;
}

// =============================================================================
// Application Domain Types
// =============================================================================

/**
 * Analysis Status Union Type
 */
export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'error';

/**
 * Payment Status Union Type
 */
export type PaymentStatus = 'balanced' | 'overpaid' | 'underpaid';

/**
 * Analysis Source Union Type
 */
export type AnalysisSource = 'upload' | 'manual' | 'import';

/**
 * Date-like values that can be converted to Date
 */
export type DateLike = string | number | Date;

/**
 * Analysis Metadata Interface
 */
export interface AnalysisMetadata {
  fileCount?: number;
  originalFilenames?: string[];
  processingTime?: number;
  totalPagesProcessed?: number;
  consignmentPatterns?: string[];
  invoicePatterns?: string[];
  processingErrors?: string[];
  settings?: {
    autoCalculate?: boolean;
    includeWeekends?: boolean;
    customRules?: Record<string, unknown>;
  };
  [key: string]: unknown; // Allow additional properties
}

/**
 * Daily Entry Data Interface
 */
export interface DailyEntryData {
  id?: string;
  analysisId: string;
  date: Date;
  consignments: number;
  rate: number;
  basePayment?: number;
  pickups?: number;
  pickupTotal?: number;
  unloadingBonus?: number;
  attendanceBonus?: number;
  earlyBonus?: number;
  paidAmount: number;
}

/**
 * Analysis Construction Data Interface
 */
export interface AnalysisConstructorData {
  id?: string;
  userId: string;
  fingerprint: string;
  source: AnalysisSource;
  status?: AnalysisStatus;
  periodStart: Date;
  periodEnd: Date;
  rulesVersion: number;
  dailyEntries?: DailyEntryData[];
  metadata?: AnalysisMetadata;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Manual Entry Interface - Unified definition for all manual entry data
 */
export interface ManualEntry {
  id: number;
  date: string;
  day: string;
  consignments: number;
  baseAmount: number;
  totalPay: number;
  expectedTotal?: number;
  pickups?: number;
  earlyArrive?: number;
  attendanceBonus?: number;
  unloadingBonus?: number;
  loadingBonus?: number;
  pickupBonus?: number;
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Generic API Response Interface
 */
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  success: boolean;
  message?: string;
}

/**
 * Generic Error Object
 */
export interface ErrorObject extends Error {
  name: string;
  message: string;
  stack?: string;
  code?: string | number;
  details?: unknown;
}

/**
 * Generic Event Handler
 */
export type EventHandler<T = Event> = (event: T) => void;

/**
 * Generic Async Function
 */
export type AsyncFunction<T = unknown, R = unknown> = (arg: T) => Promise<R>;

/**
 * Generic Object with string keys
 */
export type StringKeyObject = Record<string, unknown>;

/**
 * Generic Form Data Interface
 */
export interface FormData {
  [key: string]: unknown;
}

/**
 * Generic Validation Result
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}