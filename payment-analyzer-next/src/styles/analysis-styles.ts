/**
 * Analysis Page Style Constants
 * Centralized style definitions using the new semantic class names
 */

// Type definition for style configurations
export interface StyleConfig {
  container: string;
  header: string;
  title: string;
  subtitle: string;
  actions: string;
  helpText: string;
}

// Centralized style configurations using the new semantic naming
export const analysisStyles = {
  // Main containers
  container: {
    main: "min-h-screen bg-gray-50",
    wrapper: "max-w-4xl mx-auto",
  },

  // Step 1 styles
  step1: {
    container: "analysis-step1-container p-4 mb-4",
    header: "analysis-step1-header text-center mb-8",
    title: "analysis-step1-title text-2xl font-bold text-slate-900 mb-2",
    subtitle: "analysis-step1-subtitle text-slate-600",
    actions: "analysis-step1-actions mt-0",
    helpText: "analysis-step1-help-text text-center text-sm text-slate-500 mt-3",
  },

  // Step 2 styles
  step2: {
    container: "analysis-step2-container mt-2",
    header: "analysis-step2-header text-center",
    title: "analysis-step2-title text-2xl font-bold text-slate-900 mb-2",
    subtitle: "analysis-step2-subtitle text-slate-600",
  },

  // Data input method selector
  dataInput: {
    wrapper: "flex justify-center mb-4",
    selector:
      "data-input-method-selector bg-white rounded-xl p-1 flex gap-1 shadow-sm max-w-xs w-full",
    button: {
      base: "data-input-toggle-btn flex-1 px-2.5 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-all duration-300",
      active:
        "data-input-toggle-btn--active bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-[0_2px_8px_rgba(59,130,246,0.3)]",
      inactive: "data-input-toggle-btn--inactive text-slate-600 hover:bg-slate-100",
    },
    icon: "data-input-toggle-btn__icon w-4 h-4 flex items-center justify-center flex-shrink-0",
    label: "data-input-toggle-btn__label leading-none",
  },

  // File upload
  fileUpload: {
    wrapper: "analysis-file-upload-wrapper mb-8",
  },

  // Buttons
  buttons: {
    proceed: {
      base: "analysis-proceed-btn bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-8 py-3 rounded-full font-medium text-lg shadow-lg hover:shadow-xl transition-all duration-300 inline-flex items-center gap-3",
      content: "analysis-proceed-btn__content flex items-center gap-3",
      loader: "analysis-proceed-btn__loader hidden",
    },
  },

  // Utility classes
  utils: {
    textCenter: "text-center",
    flexCenter: "flex justify-center",
    hidden: "hidden",
  },
} as const;

// Helper function to combine classes
export const combineClasses = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(" ");
};

// Helper function to get button classes based on state
export const getDataInputButtonClasses = (isActive: boolean, disabled: boolean = false): string => {
  return combineClasses(
    analysisStyles.dataInput.button.base,
    isActive ? analysisStyles.dataInput.button.active : analysisStyles.dataInput.button.inactive,
    disabled && "opacity-50 cursor-not-allowed"
  );
};

// Helper function to get proceed button classes
export const getProceedButtonClasses = (disabled: boolean = false): string => {
  return combineClasses(analysisStyles.buttons.proceed.base, disabled && "opacity-50");
};
