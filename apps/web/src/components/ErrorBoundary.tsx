import { Component, type ReactNode } from 'react';
import styles from './ErrorBoundary.module.css';

export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('App crash:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.container}>
          <h2>Много что пошло не так!!!</h2>
          <p>Дыши глубоко и обнови страницу</p>
          <button onClick={() => window.location.reload()} className={styles.button}>
            Обновить
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
