import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../../../styles/login.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { login, isAuthenticated, error: authError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const expired = new URLSearchParams(location.search).get('expired') === '1';

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      navigate("/admin");
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      const success = await login(email, password);
      
      if (success) {
        // Redirect to admin panel or intended page
        const from = location.state?.from?.pathname || "/admin";
        navigate(from);
      }
      // Başarısızsa sebebi AuthContext'teki authError taşıyor
      // (onay bekliyor / hesap kilitli / hatalı şifre) ve aşağıda gösteriliyor.
    } catch (err) {
      setError("Giriş sırasında bir hata oluştu.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img className="login-logo" src="/assets/images/img_exclude.webp" alt="MACS" width="72" height="72" />
          <h2 className="login-title">Yönetim Paneli</h2>
          <p className="login-subtitle">MACS kulüp yöneticisi girişi</p>
        </div>
        <div className="login-body">
          {expired && (
            <div className="error-message" style={{ marginBottom: 10 }}>
              Oturum süreniz doldu. Lütfen tekrar giriş yapın.
            </div>
          )}
          {(error || authError) && (
            <div className="error-message">
              {error || authError}
            </div>
          )}
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="email" className="form-label">E-posta</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@macs.com"
                required
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="password" className="form-label">Şifre</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                required
                className="form-input"
              />
            </div>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? "Giriş Yapılıyor..." : "Giriş Yap"}
            </button>
          </form>
        </div>
        <div className="login-footer">
          <Link to="/" className="login-backlink">&larr; Siteye dön</Link>
        </div>
      </div>
    </div>
  );
}
