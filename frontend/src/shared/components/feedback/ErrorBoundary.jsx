import React from 'react';

/**
 * Render sırasında oluşan hataları yakalar.
 *
 * Bu olmadan tek bir bileşendeki hata tüm React ağacını söküyor ve
 * kullanıcı boş beyaz sayfa görüyor; üstelik hatanın olduğu da hiçbir
 * yere yansımıyor.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Beklenmeyen bir render hatası oluştu:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="error-boundary">
        <h1>Bir şeyler ters gitti</h1>
        <p>Bu sayfa yüklenirken beklenmeyen bir hata oluştu.</p>
        <div className="error-boundary__actions">
          <button type="button" onClick={this.handleReset}>
            Tekrar dene
          </button>
          <a href="/">Ana sayfaya dön</a>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
