import React from 'react';
import '../../styles/pages/Page404.css'; // CSS kodunu buraya ekle

const Page404 = () => {
  return (
    <div className="notfound-container">
      <h1 className="notfound-title">404</h1>
      <p className="notfound-text">
        Oops! The page you are looking for does not exist.
      </p>
      <a href="/" className="notfound-btn">
        Go Home
      </a>
    </div>
  );
};
export default Page404;