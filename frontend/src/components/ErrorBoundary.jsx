import React, { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('BookBazaar frontend error:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="section page-top">
        <div className="container">
          <div className="error-panel">
            <span className="kicker">Something went wrong</span>
            <h1>Oops! Something went wrong.</h1>
            <p>{this.state.error?.message || 'Unknown frontend error.'}</p>
            <p className="muted">We couldn't load this page right now. Please try again later.</p>
            <button className="btn btn-dark" onClick={() => window.location.reload()}>Reload</button>
          </div>
        </div>
      </main>
    );
  }
}
