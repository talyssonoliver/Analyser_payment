/**
 * Progress Tracking Service
 * 8-stage detailed progress system matching original HTML
 */

export interface ProgressStage {
  id: number;
  name: string;
  description: string;
  icon: string;
  estimatedDuration: number; // in milliseconds
  isActive: boolean;
  isComplete: boolean;
  startTime?: number;
  endTime?: number;
  error?: string;
  details?: string;
}

export interface ProgressState {
  currentStage: number;
  totalStages: number;
  stages: ProgressStage[];
  isActive: boolean;
  startTime: number;
  estimatedCompletion?: number;
  overallProgress: number; // 0-100
}

export type ProgressCallback = (progress: ProgressState) => void;

export class ProgressTrackingService {
  private static instance: ProgressTrackingService | null = null;
  private progressState: ProgressState;
  private readonly callbacks: Set<ProgressCallback> = new Set();
  private readonly stageTimeouts: Map<number, NodeJS.Timeout> = new Map();

  // Define the 8 stages matching original HTML
  private static readonly STAGES: Omit<ProgressStage, 'isActive' | 'isComplete' | 'startTime' | 'endTime'>[] = [
    {
      id: 0,
      name: 'Initializing',
      description: 'Setting up analysis environment and validating input',
      icon: '⚙️',
      estimatedDuration: 500
    },
    {
      id: 1,
      name: 'Loading Rules',
      description: 'Loading payment calculation rules and business logic',
      icon: '📋',
      estimatedDuration: 300
    },
    {
      id: 2,
      name: 'Reading PDFs',
      description: 'Opening and parsing PDF documents for processing',
      icon: '📄',
      estimatedDuration: 2000
    },
    {
      id: 3,
      name: 'Extracting Data',
      description: 'Extracting consignment and payment data from documents',
      icon: '🔍',
      estimatedDuration: 3000
    },
    {
      id: 4,
      name: 'Processing',
      description: 'Processing extracted data and organizing by date',
      icon: '⚡',
      estimatedDuration: 1500
    },
    {
      id: 5,
      name: 'Validating',
      description: 'Validating data integrity and checking business rules',
      icon: '✅',
      estimatedDuration: 800
    },
    {
      id: 6,
      name: 'Calculating',
      description: 'Performing payment calculations and generating totals',
      icon: '🧮',
      estimatedDuration: 1000
    },
    {
      id: 7,
      name: 'Generating Report',
      description: 'Creating analysis results and preparing display',
      icon: '📊',
      estimatedDuration: 700
    },
    {
      id: 8,
      name: 'Complete',
      description: 'Analysis completed successfully!',
      icon: '🎉',
      estimatedDuration: 200
    }
  ];

  private constructor() {
    this.progressState = this.initializeProgress();
  }

  static getInstance(): ProgressTrackingService {
    this.instance ??= new ProgressTrackingService();
    return this.instance;
  }

  private initializeProgress(): ProgressState {
    const stages = ProgressTrackingService.STAGES.map(stage => ({
      ...stage,
      isActive: false,
      isComplete: false
    }));

    return {
      currentStage: -1,
      totalStages: stages.length - 1, // Don't count "Complete" stage
      stages,
      isActive: false,
      startTime: 0,
      overallProgress: 0
    };
  }

  /**
   * Subscribe to progress updates
   */
  subscribe(callback: ProgressCallback): () => void {
    this.callbacks.add(callback);
    
    // Send current state immediately
    callback(this.progressState);
    
    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * Notify all subscribers of progress update
   */
  private notify(): void {
    this.callbacks.forEach(callback => {
      try {
        callback({ ...this.progressState });
      } catch (error) {
        console.error('Progress callback error:', error);
      }
    });
  }

  /**
   * Start progress tracking
   */
  start(): void {
    console.log('🚀 Starting progress tracking');
    
    this.progressState = this.initializeProgress();
    this.progressState.isActive = true;
    this.progressState.startTime = Date.now();
    
    // Calculate estimated completion time
    const totalEstimatedTime = this.progressState.stages
      .slice(0, -1) // Exclude "Complete" stage
      .reduce((sum, stage) => sum + stage.estimatedDuration, 0);
    
    this.progressState.estimatedCompletion = this.progressState.startTime + totalEstimatedTime;
    
    this.notify();
    
    // Auto-advance to first stage
    setTimeout(() => this.advanceToStage(0), 100);
  }

  /**
   * Advance to specific stage
   */
  advanceToStage(stageId: number, details?: string): void {
    if (stageId < 0 || stageId >= this.progressState.stages.length) {
      console.error('Invalid stage ID:', stageId);
      return;
    }

    const now = Date.now();
    
    // Complete previous stages
    for (let i = 0; i < stageId; i++) {
      const stage = this.progressState.stages[i];
      if (!stage.isComplete) {
        stage.isComplete = true;
        stage.isActive = false;
        stage.endTime = now;
      }
    }

    // Activate current stage
    const currentStage = this.progressState.stages[stageId];
    currentStage.isActive = true;
    currentStage.isComplete = false;
    currentStage.startTime = now;
    currentStage.details = details;
    
    // Clear any existing error
    currentStage.error = undefined;

    this.progressState.currentStage = stageId;
    
    // Calculate overall progress
    this.updateOverallProgress();
    
    const detailsText = details ? ` (${details})` : '';
    console.log(`📍 Progress: Stage ${stageId} - ${currentStage.name}${detailsText}`);
    
    this.notify();

    // Clear any existing timeout for this stage
    const existingTimeout = this.stageTimeouts.get(stageId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Auto-advance to next stage after estimated duration (fallback)
    if (stageId < this.progressState.totalStages) {
      const timeout = setTimeout(() => {
        if (this.progressState.currentStage === stageId && this.progressState.isActive) {
          console.warn(`⏰ Auto-advancing from stage ${stageId} due to timeout`);
          this.advanceToStage(stageId + 1);
        }
      }, currentStage.estimatedDuration + 5000); // Add 5s buffer
      
      this.stageTimeouts.set(stageId, timeout);
    }
  }

  /**
   * Update stage with additional details or progress
   */
  updateStageDetails(stageId: number, details: string): void {
    if (stageId >= 0 && stageId < this.progressState.stages.length) {
      this.progressState.stages[stageId].details = details;
      this.notify();
    }
  }

  /**
   * Mark stage as failed with error
   */
  failStage(stageId: number, error: string): void {
    if (stageId >= 0 && stageId < this.progressState.stages.length) {
      const stage = this.progressState.stages[stageId];
      stage.error = error;
      stage.isActive = false;
      stage.endTime = Date.now();
      
      // Stop progress tracking
      this.progressState.isActive = false;
      
      console.error(`❌ Stage ${stageId} failed: ${error}`);
      this.notify();
    }
  }

  /**
   * Complete all progress tracking
   */
  complete(): void {
    const now = Date.now();
    
    // Complete all stages
    this.progressState.stages.forEach((stage, index) => {
      if (!stage.isComplete && index <= this.progressState.totalStages) {
        stage.isComplete = true;
        stage.isActive = false;
        stage.endTime = now;
      }
    });

    // Activate final "Complete" stage
    const completeStage = this.progressState.stages[this.progressState.stages.length - 1];
    completeStage.isActive = true;
    completeStage.startTime = now;
    
    this.progressState.currentStage = this.progressState.stages.length - 1;
    this.progressState.overallProgress = 100;
    this.progressState.isActive = false;
    
    // Clear all timeouts
    this.stageTimeouts.forEach(timeout => clearTimeout(timeout));
    this.stageTimeouts.clear();
    
    console.log('✅ Progress tracking completed');
    this.notify();

    // Auto-hide after a delay
    setTimeout(() => {
      this.reset();
    }, 2000);
  }

  /**
   * Abort progress tracking
   */
  abort(reason?: string): void {
    this.progressState.isActive = false;
    
    if (this.progressState.currentStage >= 0) {
      this.failStage(this.progressState.currentStage, reason || 'Analysis aborted');
    }
    
    // Clear all timeouts
    this.stageTimeouts.forEach(timeout => clearTimeout(timeout));
    this.stageTimeouts.clear();
    
    console.log('🛑 Progress tracking aborted:', reason);
  }

  /**
   * Reset progress tracking
   */
  reset(): void {
    this.progressState = this.initializeProgress();
    
    // Clear all timeouts
    this.stageTimeouts.forEach(timeout => clearTimeout(timeout));
    this.stageTimeouts.clear();
    
    this.notify();
  }

  /**
   * Get current progress state
   */
  getProgress(): ProgressState {
    return { ...this.progressState };
  }

  /**
   * Calculate overall progress percentage
   */
  private updateOverallProgress(): void {
    const activeStages = this.progressState.stages.slice(0, -1); // Exclude "Complete"
    const completedCount = activeStages.filter(stage => stage.isComplete).length;
    const currentProgress = this.progressState.currentStage >= 0 ? 0.5 : 0; // Half credit for current stage
    
    this.progressState.overallProgress = Math.round(
      ((completedCount + currentProgress) / activeStages.length) * 100
    );
  }

  /**
   * Get estimated time remaining
   */
  getEstimatedTimeRemaining(): number {
    if (!this.progressState.isActive || this.progressState.currentStage < 0) {
      return 0;
    }

    const remainingStages = this.progressState.stages.slice(this.progressState.currentStage + 1, -1);
    const currentStage = this.progressState.stages[this.progressState.currentStage];
    
    let timeRemaining = 0;
    
    // Add remaining time for current stage
    if (currentStage.startTime) {
      const elapsed = Date.now() - currentStage.startTime;
      timeRemaining += Math.max(0, currentStage.estimatedDuration - elapsed);
    }
    
    // Add time for remaining stages
    timeRemaining += remainingStages.reduce((sum, stage) => sum + stage.estimatedDuration, 0);
    
    return timeRemaining;
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    totalTime: number;
    averageStageTime: number;
    slowestStage?: { id: number; name: string; duration: number };
    fastestStage?: { id: number; name: string; duration: number };
  } {
    const completedStages = this.progressState.stages.filter(stage => 
      stage.isComplete && stage.startTime && stage.endTime
    );

    if (completedStages.length === 0) {
      return { totalTime: 0, averageStageTime: 0 };
    }

    const stageDurations = completedStages.map(stage => ({
      id: stage.id,
      name: stage.name,
      duration: stage.endTime! - stage.startTime!
    }));

    const totalTime = this.progressState.startTime > 0 ? Date.now() - this.progressState.startTime : 0;
    const averageStageTime = stageDurations.reduce((sum, s) => sum + s.duration, 0) / stageDurations.length;
    
    const slowestStage = stageDurations.reduce((max, stage) => 
      stage.duration > max.duration ? stage : max, stageDurations[0]
    );
    
    const fastestStage = stageDurations.reduce((min, stage) => 
      stage.duration < min.duration ? stage : min, stageDurations[0]
    );

    return {
      totalTime,
      averageStageTime,
      slowestStage,
      fastestStage
    };
  }
}