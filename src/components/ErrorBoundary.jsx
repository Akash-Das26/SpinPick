import React from 'react';
import * as Sentry from '@sentry/react';
import { AlertTriangle, RefreshCw } from '../lib/icons';
import styles from './ErrorBoundary.module.css';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('SpinPick Error Boundary caught error:', error, errorInfo);
    // Report to Sentry if initialized
    try {
      Sentry.captureException(error, {
        extra: {
          componentStack: errorInfo?.componentStack,
          errorBoundary: 'SpinPickErrorBoundary',
        },
      });
    } catch {
      // Sentry itself should never crash the app
    }
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className={`bg-dark text-primary grid grid-center p-24 ${styles.errorBoundary__root}`}>
          <div className={`bg-surface border-medium p-32 text-center ${styles.errorBoundary__card}`}>
            <div className={`${styles.errorBoundary__iconWrapper} rounded-md text-danger grid-center mx-auto mb-20`}>
              <AlertTriangle size={28} />
            </div>

            <h2 className="text-xl font-extrabold mb-8">
              Something Went Wrong
            </h2>

            <p className={`text-base leading-normal mb-24 ${styles.errorBoundary__message}`}>
              SpinPick encountered an unexpected error. Don't worry, your decision history is preserved in storage.
            </p>

            <button
              onClick={this.handleReload}
              className={`${styles.errorBoundary__reloadBtn}`}
            >
              <RefreshCw size={16} />
              Reload Studio
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
