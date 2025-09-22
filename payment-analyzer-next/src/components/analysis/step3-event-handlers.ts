/**
 * Step 3 Event Handlers
 * Event management exactly like original HTML
 */

// Type definitions
export interface EventHandlerCallbacks {
  onSetStep: (step: number) => void;
  onViewDetailedReport: () => void;
  onStartNewAnalysis: () => void;
  onViewWeekReport: (weekNumber: number, weekYear: number, weekIndex: number) => void;
  onWeekHeaderClick: (weekId: string) => void;
  onWeekTitleClick: (weekNumber: number, weekYear: number) => void;
}

// Global MutationObserver instance and flag to prevent loops
let step3Observer: MutationObserver | null = null;
let isManuallyTogglingWeek = false;

/**
 * Attach Step 3 Event Listeners
 * Uses MutationObserver for reliable DOM element detection
 */
export function attachStep3EventListeners(callbacks: EventHandlerCallbacks): void {
  console.log('🚀 Setting up Step 3 event listeners with MutationObserver');
  
  // Clean up existing observer
  if (step3Observer) {
    step3Observer.disconnect();
  }
  
  // Attach existing elements immediately
  attachButtonListeners(callbacks);
  attachWeekEventListeners(callbacks);
  
  // Set up MutationObserver to watch for new elements
  step3Observer = new MutationObserver((mutations) => {
    // Skip if we're manually toggling to prevent infinite loops
    if (isManuallyTogglingWeek) {
      console.log('📡 MutationObserver: Skipping during manual week toggle');
      return;
    }
    
    let shouldCheckButtons = false;
    let shouldCheckWeekHeaders = false;
    
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          
          // Check if new buttons were added
          if (element.id === 'viewDetailedReportBtn' || element.id === 'startNewAnalysisStep3Btn' || 
              element.querySelector('#viewDetailedReportBtn, #startNewAnalysisStep3Btn')) {
            shouldCheckButtons = true;
          }
          
          // Check if new week headers were added
          if (element.classList?.contains('week-header') || 
              element.querySelector?.('.week-header')) {
            shouldCheckWeekHeaders = true;
          }
        }
      });
    });
    
    // Attach listeners for newly added elements
    if (shouldCheckButtons) {
      console.log('📡 MutationObserver detected new buttons, attaching listeners');
      attachButtonListeners(callbacks);
    }
    
    if (shouldCheckWeekHeaders) {
      console.log('📡 MutationObserver detected new week headers, attaching listeners');
      attachWeekEventListeners(callbacks);
    }
  });
  
  // Start observing
  step3Observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log('✅ MutationObserver setup complete');
}

/**
 * Attach button event listeners
 */
function attachButtonListeners(callbacks: EventHandlerCallbacks): void {
  const viewReportBtn = document.getElementById('viewDetailedReportBtn');
  const newAnalysisBtn = document.getElementById('startNewAnalysisStep3Btn');
  
  console.log(`Button detection: viewBtn=${!!viewReportBtn}, newBtn=${!!newAnalysisBtn}`);
  
  if (viewReportBtn && !((viewReportBtn as HTMLElement & { _step3ListenerAttached?: boolean })._step3ListenerAttached)) {
    viewReportBtn.onclick = (e) => {
      e.preventDefault();
      console.log('📊 View Detailed Report clicked');
      callbacks.onViewDetailedReport();
      return false;
    };
    (viewReportBtn as HTMLElement & { _step3ListenerAttached?: boolean })._step3ListenerAttached = true;
    console.log('✅ View Report button listener attached');
  }
  
  if (newAnalysisBtn && !((newAnalysisBtn as HTMLElement & { _step3ListenerAttached?: boolean })._step3ListenerAttached)) {
    newAnalysisBtn.onclick = (e) => {
      e.preventDefault();
      console.log('🔄 Start New Analysis clicked');
      callbacks.onStartNewAnalysis();
      return false;
    };
    (newAnalysisBtn as HTMLElement & { _step3ListenerAttached?: boolean })._step3ListenerAttached = true;
    console.log('✅ New Analysis button listener attached');
  }
}

/**
 * Attach week-related event listeners separately
 */
function attachWeekEventListeners(callbacks: EventHandlerCallbacks): void {
  // Week header click handlers for expand/collapse
  const weekHeaders = document.querySelectorAll('.week-header');
  console.log(`Step3 Events: Found ${weekHeaders.length} week headers`);
  console.log('Available week headers:', Array.from(weekHeaders).map(h => h.getAttribute('data-week-id')));
  
  if (weekHeaders.length === 0) {
    console.log('📡 No week headers found yet - MutationObserver will handle them when they appear');
    return;
  }
  
  weekHeaders.forEach((header, index) => {
    const weekId = header.getAttribute('data-week-id');
    console.log(`Step3 Events: Processing header ${index + 1}: ${weekId}`);
    
    // Skip if already has listener attached
    if ((header as HTMLElement & { _step3WeekListenerAttached?: boolean })._step3WeekListenerAttached) {
      console.log(`⏭️ Header ${weekId} already has listener, skipping`);
      return;
    }
    
    // Use onclick for reliability
    const clickHandler = (e: Event) => {
      console.log(`🖱️ Week header clicked: ${weekId}`, e.target);
      e.preventDefault();
      e.stopPropagation();
      
      if (!weekId) {
        console.error('❌ No weekId found for header');
        return;
      }
      
      // Check if click was on week title (for navigation)
      const target = e.target as HTMLElement;
      if (target.closest('.week-title')) {
        console.log('📅 Click was on week title - attempting navigation');
        const weekTitle = header.querySelector('.week-title');
        if (weekTitle && weekTitle.textContent) {
          const match = weekTitle.textContent.match(/Week (\d+), (\d+)/);
          if (match) {
            const [, weekNumber, weekYear] = match;
            console.log(`🎯 Navigating to Week ${weekNumber}, ${weekYear}`);
            callbacks.onWeekTitleClick(parseInt(weekNumber), parseInt(weekYear));
            return; // Don't toggle if clicking on title
          }
        }
      }
      
      // Otherwise toggle expand/collapse
      console.log(`🔄 Toggling expand/collapse for: ${weekId}`);
      callbacks.onWeekHeaderClick(weekId);
    };
    
    (header as HTMLElement).onclick = clickHandler;
    (header as HTMLElement & { _step3WeekListenerAttached?: boolean })._step3WeekListenerAttached = true;
    console.log(`✅ Week header listener attached: ${weekId}`);
  });
  
  // Individual week report buttons
  const weekReportBtns = document.querySelectorAll('.view-week-report-btn');
  weekReportBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent week header click
      
      const weekNumber = parseInt(btn.getAttribute('data-week-number') || '0');
      const weekYear = parseInt(btn.getAttribute('data-week-year') || '0');
      const weekIndex = parseInt(btn.getAttribute('data-week-index') || '0');
      
      if (weekNumber && weekYear) {
        callbacks.onViewWeekReport(weekNumber, weekYear, weekIndex);
      }
    });
  });
}

/**
 * Toggle Week Expansion
 * Fixed version with consistent ID handling
 */
export function toggleWeekExpansion(weekId: string): void {
  console.log(`🔽 toggleWeekExpansion called for: ${weekId}`);
  
  // Set flag to prevent MutationObserver loops
  isManuallyTogglingWeek = true;
  
  const weekHeader = document.querySelector(`[data-week-id="${weekId}"]`) as HTMLElement;
  // Use exact ID pattern from original HTML: weekId + "-content"
  const weekContent = document.getElementById(`${weekId}-content`);
  
  console.log(`🔍 Element check:`, {
    weekId,
    weekHeader: !!weekHeader,
    weekContent: !!weekContent,
    contentId: `${weekId}-content`,
    contentDisplay: weekContent?.style.display,
    contentClasses: weekContent?.className,
    contentComputedStyle: weekContent ? window.getComputedStyle(weekContent).display : 'N/A',
    contentScrollHeight: weekContent?.scrollHeight,
    contentOffsetHeight: weekContent?.offsetHeight,
    hasChildren: weekContent?.children?.length || 0,
    actualId: weekContent?.id || 'not found'
  });
  
  if (weekContent) {
    // Use computed style to check actual visibility like original HTML
    const computedStyle = window.getComputedStyle(weekContent);
    const isCurrentlyVisible = computedStyle.display !== 'none';
    
    console.log(`📊 Current state: display="${computedStyle.display}", visible=${isCurrentlyVisible}`);
    
    if (isCurrentlyVisible) {
      // Collapse - force hide with !important to override any CSS conflicts
      weekContent.style.setProperty('display', 'none', 'important');
      weekHeader?.classList.remove('expanded');
      
      // Rotate chevron back to original position  
      const chevron = weekHeader?.querySelector('.week-toggle svg');
      if (chevron) {
        (chevron as HTMLElement).style.transform = 'rotate(0deg)';
        (chevron as HTMLElement).style.transition = 'transform 0.3s ease';
      }
      
      console.log(`🔼 Collapsed: ${weekId} - set display: none directly`);
    } else {
      // Expand - nuclear option: force ALL visibility styles
      weekContent.style.setProperty('display', 'block', 'important');
      weekContent.style.setProperty('visibility', 'visible', 'important');
      weekContent.style.setProperty('opacity', '1', 'important');
      weekContent.style.setProperty('height', 'auto', 'important');
      weekContent.style.setProperty('max-height', 'none', 'important');
      weekContent.style.setProperty('overflow', 'visible', 'important');
      weekContent.style.setProperty('position', 'static', 'important');
      console.log('🚨 NUCLEAR OPTION: Forcing ALL visibility styles with !important');
      weekHeader?.classList.add('expanded');
      
      // Rotate chevron to 180 degrees
      const chevron = weekHeader?.querySelector('.week-toggle svg');
      if (chevron) {
        (chevron as HTMLElement).style.transform = 'rotate(180deg)';
        (chevron as HTMLElement).style.transition = 'transform 0.3s ease';
      }
      
      console.log(`🔽 Expanded: ${weekId} - set display: block directly`);
      
      // Debug: Verify expansion worked
      setTimeout(() => {
        const verifyStyle = window.getComputedStyle(weekContent);
        console.log(`🔍 Post-expansion check:`, {
          weekId,
          contentClasses: weekContent.className,
          headerClasses: weekHeader?.className,
          contentDisplay: verifyStyle.display,
          contentVisibility: verifyStyle.visibility,
          contentOpacity: verifyStyle.opacity,
          contentHeight: weekContent.offsetHeight,
          contentScrollHeight: weekContent.scrollHeight,
          contentVisible: weekContent.offsetHeight > 0,
          hasChildren: weekContent.children.length,
          innerHTML: weekContent.innerHTML.substring(0, 100) + '...',
          overflowStyle: verifyStyle.overflow,
          maxHeightStyle: verifyStyle.maxHeight,
          inlineStyle: weekContent.style.display
        });
      }, 100);
    }
  } else {
    console.error(`❌ Week content not found for ID: ${weekId}`);
    // List all available IDs for debugging
    const allIds = Array.from(document.querySelectorAll('[id]')).map(el => el.id);
    console.log('Available IDs:', allIds.filter(id => id.includes('week')));
  }
  
  // Clear the flag after a delay to allow DOM changes to settle
  setTimeout(() => {
    isManuallyTogglingWeek = false;
    console.log('🔄 Manual toggle flag cleared');
  }, 200);
}

/**
 * Manual test function for debugging - can be called from browser console
 * Usage: window.testWeekToggle('week-0')
 */
export function testWeekToggle(weekId: string): void {
  console.log(`🧪 Manual test: toggling ${weekId}`);
  toggleWeekExpansion(weekId);
}

// Make function available globally for testing
if (typeof window !== 'undefined') {
  (window as Window & { testWeekToggle?: typeof testWeekToggle; toggleWeekExpansion?: typeof toggleWeekExpansion }).testWeekToggle = testWeekToggle;
  (window as Window & { testWeekToggle?: typeof testWeekToggle; toggleWeekExpansion?: typeof toggleWeekExpansion }).toggleWeekExpansion = toggleWeekExpansion;
}

/**
 * Clean up event listeners
 * Important for React component unmounting
 */
export function cleanupStep3EventListeners(): void {
  console.log('🧹 Cleaning up Step 3 event listeners');
  
  // Disconnect MutationObserver
  if (step3Observer) {
    step3Observer.disconnect();
    step3Observer = null;
    console.log('✅ MutationObserver disconnected');
  }
  
  // Remove custom listener flags from elements
  const elementsWithListeners = [
    '#viewDetailedReportBtn',
    '#startNewAnalysisStep3Btn',
    '.week-header',
    '.view-week-report-btn'
  ];
  
  elementsWithListeners.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      // Remove our custom flags
      delete (element as HTMLElement & { _step3ListenerAttached?: boolean })._step3ListenerAttached;
      delete (element as HTMLElement & { _step3WeekListenerAttached?: boolean })._step3WeekListenerAttached;
      
      // Clear onclick handlers
      (element as HTMLElement).onclick = null;
    });
  });
  
  console.log('✅ Step 3 event listeners cleaned up');
}

/**
 * Handle displayAnalysisResults DOM updates
 * Updates specific DOM elements if they exist
 */
export function updateAnalysisResultsDOM(analysisResultsHTML: string): void {
  const analysisStatus = document.getElementById('analysisStatus');
  const analysisResults = document.getElementById('analysisResults');
  const analysisActions = document.getElementById('analysisActions');
  
  if (analysisStatus) {
    // Hide loading status
    analysisStatus.style.display = 'none';
  }
  
  if (analysisResults) {
    // Update results content
    analysisResults.innerHTML = analysisResultsHTML;
    analysisResults.style.display = 'block';
  }
  
  if (analysisActions) {
    // Show actions
    analysisActions.style.display = 'block';
  }
}