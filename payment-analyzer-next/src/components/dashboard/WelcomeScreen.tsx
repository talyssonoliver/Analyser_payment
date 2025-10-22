/**
 * WelcomeScreen Component
 * Onboarding screen for new users with no analysis data
 */

"use client";

import { Plus, TrendingUp } from "lucide-react";
import styles from "@/styles/dashboard/welcome.module.css";

interface WelcomeScreenProps {
  onNavigate: (path: string) => void;
}

export function WelcomeScreen({ onNavigate }: Readonly<WelcomeScreenProps>) {
  return (
    <div className={styles.container}>
      {/* Welcome Hero Section */}
      <div className={styles.hero}>
        <h1 className={styles.title}>Welcome to Payment Analyzer!</h1>
        <p className={styles.subtitle}>
          Your intelligent companion for tracking delivery payments and financial insights
        </p>
      </div>

      {/* Call to Action */}
      <div className={styles.ctaSection}>
        <div className={styles.ctaButtons}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => onNavigate("/analysis?fresh=true")}
          >
            <span className={styles.buttonIcon}>
              <TrendingUp className="w-5 h-5" />
            </span>
            <span>Upload & Analyze</span>
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => onNavigate("/analysis?fresh=true")}
          >
            <span className={styles.buttonIcon}>
              <Plus className="w-5 h-5" />
            </span>
            <span>Manual Entry</span>
          </button>
        </div>
        <p className={styles.ctaSubtitle}>
          Ready to go? Upload your documents or enter data to start analysis.
        </p>
      </div>
    </div>
  );
}
