/**
 * Emergency Week Toggle Fix
 * Simplified fallback functionality - main logic is now in step3-event-handlers.ts
 * This is kept as a manual emergency fix for debugging purposes only
 */

export function forceWeekToggleToWork(): void {
  console.log('🔧 Emergency week toggle fix (should not be needed with MutationObserver)');
  
  const weekHeaders = document.querySelectorAll('.week-header');
  console.log(`Emergency fix: Found ${weekHeaders.length} week headers`);
  
  if (weekHeaders.length === 0) {
    console.log('⚠️ No week headers found for emergency fix');
    return;
  }
  
  weekHeaders.forEach((header) => {
    const weekId = header.getAttribute('data-week-id');
    if (!weekId) return;
    
    // Only attach if no listener is already present
    if ((header as Element & { _step3WeekListenerAttached?: boolean })._step3WeekListenerAttached) {
      console.log(`⏭️ Emergency fix: Header ${weekId} already has listener, skipping`);
      return;
    }
    
    console.log(`🔧 Emergency fix: Adding click handler to ${weekId}`);
    
    (header as HTMLElement).onclick = function(e) {
      console.log(`🖱️ EMERGENCY CLICK: ${weekId}`);
      e.preventDefault();
      e.stopPropagation();
      
      // Use exact ID pattern from original HTML: weekId + "-content"
      const content = document.getElementById(`${weekId}-content`);
      
      if (!content) {
        console.error(`❌ Emergency fix: No content found for ${weekId}`);
        return;
      }
      
      // CSS class-based toggle logic to match main implementation
      const isExpanded = content.classList.contains('expanded');
      
      if (isExpanded) {
        content.classList.remove('expanded');
        header.classList.remove('expanded');
        console.log(`🔼 Emergency fix: Collapsed ${weekId} - removed expanded classes`);
      } else {
        content.classList.add('expanded');
        header.classList.add('expanded');
        console.log(`🔽 Emergency fix: Expanded ${weekId} - added expanded classes`);
      }
      
      return false;
    };
    
    (header as Element & { _step3WeekListenerAttached?: boolean })._step3WeekListenerAttached = true;
  });
}

// Make available globally for manual debugging
if (typeof window !== 'undefined') {
  (window as typeof window & { forceWeekToggleToWork?: typeof forceWeekToggleToWork }).forceWeekToggleToWork = forceWeekToggleToWork;
}