/**
 * Query Performance Monitor
 * Tracks slow queries and provides optimization suggestions
 */

interface QueryMetrics {
  query: string;
  duration: number;
  table: string;
  timestamp: string;
}

class QueryPerformanceMonitor {
  private static instance: QueryPerformanceMonitor;
  private metrics: QueryMetrics[] = [];
  private readonly SLOW_QUERY_THRESHOLD = 1000; // 1 second
  private readonly MAX_METRICS = 100;

  static getInstance(): QueryPerformanceMonitor {
    if (!QueryPerformanceMonitor.instance) {
      QueryPerformanceMonitor.instance = new QueryPerformanceMonitor();
    }
    return QueryPerformanceMonitor.instance;
  }

  /**
   * Wrap Supabase queries with performance monitoring
   */
  async trackQuery<T>(
    queryName: string,
    table: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await queryFn();
      const duration = performance.now() - startTime;
      
      // Log slow queries
      if (duration > this.SLOW_QUERY_THRESHOLD) {
        console.warn(`Slow query detected: ${queryName} on ${table} took ${duration.toFixed(2)}ms`);
        this.logMetric(queryName, duration, table);
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(`Query failed: ${queryName} on ${table} after ${duration.toFixed(2)}ms`, error);
      throw error;
    }
  }

  private logMetric(query: string, duration: number, table: string) {
    this.metrics.push({
      query,
      duration,
      table,
      timestamp: new Date().toISOString()
    });

    // Keep only recent metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }
  }

  /**
   * Get performance report
   */
  getPerformanceReport(): {
    slowQueries: QueryMetrics[];
    averageDuration: number;
    recommendations: string[];
  } {
    const slowQueries = this.metrics.filter(m => m.duration > this.SLOW_QUERY_THRESHOLD);
    const avgDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0) / this.metrics.length || 0;

    const recommendations: string[] = [];
    
    // Analysis of slow query patterns
    const tableFrequency = slowQueries.reduce((acc, m) => {
      acc[m.table] = (acc[m.table] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(tableFrequency).forEach(([table, count]) => {
      if (count > 3) {
        recommendations.push(`Consider optimizing queries on ${table} table (${count} slow queries detected)`);
      }
    });

    if (avgDuration > 500) {
      recommendations.push('Average query time is high - consider index optimization');
    }

    return {
      slowQueries,
      averageDuration: avgDuration,
      recommendations
    };
  }
}

export const queryMonitor = QueryPerformanceMonitor.getInstance();
