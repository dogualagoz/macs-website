import React, { useState, useEffect } from 'react';
import Loading from '../../../shared/components/feedback/Loading';
import ErrorMessage from '../../../shared/components/feedback/ErrorMessage';

export default function SponsorsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      //! ileride backend'den veri çekilecek
      // const response = await sponsorService.getAll();
      // setSponsors(response);
      //ekleme
      
      await new Promise(resolve => setTimeout(resolve, 500));
      setError('Veriler yüklenirken bir hata oluştu');
    } catch (err) {
      console.error('Error loading sponsors:', err);
      setError('Veriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const retry = () => {
    setLoading(true);
    setError(null);
    loadData();
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} onRetry={retry} />;

  return (
    <section className="sponsors-section">
      <div className="sponsors-container">
        <h2 className="section-title">Sponsorlarımız</h2>
        <p className="section-description">
          Bize destek olan değerli sponsorlarımız
        </p>
        {/* sponsor içerikleri buraya eklenecek */}
      </div>
    </section>
  );
}
