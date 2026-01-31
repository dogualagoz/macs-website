import { Helmet } from 'react-helmet-async';
import PropTypes from 'prop-types';

/**
 * SEO Component
 * Provides dynamic meta tags for each page
 */
const SEO = ({ 
  title = 'MACS',
  description = 'MACS, Eskişehir Osmangazi Üniversitesi Matematik ve Bilgisayar Bilimleri Bölümü öğrencilerinin kurduğu aktif bir öğrenci topluluğudur.',
  keywords = 'MACS, Matematik, Bilgisayar Bilimleri, ESOGÜ, yazılım, topluluk',
  image = '/assets/images/og-image.png',
  url = 'https://esogumacs.com',
  type = 'website'
}) => {
  const siteTitle = title === 'MACS' ? title : `${title} | MACS`;
  
  return (
    <Helmet>
      {/* Temel Meta */}
      <title>{siteTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      
      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={url} />
      <meta property="og:locale" content="tr_TR" />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={url} />
    </Helmet>
  );
};

SEO.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  keywords: PropTypes.string,
  image: PropTypes.string,
  url: PropTypes.string,
  type: PropTypes.string
};

export default SEO;
