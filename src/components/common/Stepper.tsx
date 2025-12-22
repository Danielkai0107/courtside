import React from 'react';
import clsx from 'clsx';
import styles from './Stepper.module.scss';

export interface StepperProps {
  steps: string[];
  currentStep: number;
  className?: string;
}

const Stepper: React.FC<StepperProps> = ({ steps, currentStep, className }) => {
  return (
    <div className={clsx(styles.stepper, className)}>
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isCompleted = stepNumber < currentStep;

        return (
          <div key={index} className={styles.stepWrapper}>
            <div className={styles.step}>
              <div
                className={clsx(
                  styles.circle,
                  isActive && styles.active,
                  isCompleted && styles.completed
                )}
              >
                {isCompleted ? '✓' : stepNumber}
              </div>
              <span
                className={clsx(
                  styles.label,
                  isActive && styles.active,
                  isCompleted && styles.completed
                )}
              >
                {step}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={clsx(
                  styles.line,
                  isCompleted && styles.completed
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default Stepper;

