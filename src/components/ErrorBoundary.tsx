// "Something went wrong" instead of a blank app: wraps the whole app and each screen or table
import '../styles/conn.css';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { forgetTabSession } from '../lib/storage';

interface Props {
  children: ReactNode;
  /** where it broke, for the console */
  where?: string;
  /** Back to Home; without it this tab forgets its seat and the page opens fresh */
  onHome?: () => void;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[${this.props.where ?? 'app'}] screen crashed`, error, info.componentStack);
  }

  private home = () => {
    const { onHome } = this.props;
    if (onHome) {
      onHome();
      this.setState({ error: null });
      return;
    }
    forgetTabSession();
    location.assign(location.pathname);
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="screen center-screen crash-screen" role="alert">
        <h2>Something went wrong</h2>
        <p className="muted">This screen hit a problem. Reload to try again.</p>
        <div className="crash-actions">
          <button className="btn primary" onClick={() => location.reload()}>
            Reload
          </button>
          <button className="btn" onClick={this.home}>
            Back to Home
          </button>
        </div>
      </main>
    );
  }
}
