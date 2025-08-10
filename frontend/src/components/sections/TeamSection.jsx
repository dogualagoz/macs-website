import React from "react";

const TeamSection = () => {
  return (
    <section className="team-section" style={{ cursor: "default" }}>
       
      <div className="container">
        <h2 className="section-title">Ekibimizle Tanışın</h2>
        <p className="section-subtitle">
          MACS topluluğunu yöneten deneyimli ve tutkulu, matematik ve bilgisayar
          bilimleri alanında yenilikçi projeler geliştiren ekibimiz.
        </p>

        <div className="team-grid">
          {[...Array(6)].map((_, index) => (
            <div className="team-member" key={index}>
              <div className="member-avatar" style={{ cursor: "pointer" }}></div>
               
              <h3 className="member-name">Berke Zerelgil</h3>
              <p className="member-role">Kulüp Başkanı</p>
              <p className="member-department">
                Matematik ve Bilgisayar Bilimleri 3. Sınıf
              </p>
              <p className="member-bio">
                Designer ve Uygulama Geliştirme odaklı, MACS kulübü ekip lideri
              </p>
              <div className="member-social">
                <img src="../assets/images/img_linkedin.png" alt="LinkedIn" />
                <img src="../assets/images/img_github_18x17.png" alt="GitHub" />
                <img
                  src="../assets/images/img_instagram_circle.png"
                  alt="Instagram"
                />
                <img src="../assets/images/img_email.png" alt="Email" />
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <a href="#" className="view-more-team">
            <span>Daha fazla</span>
            <img src="../assets/images/img_vector.svg" alt="Arrow" />
          </a>
        </div>
      </div>
    </section>
  );
};

export default TeamSection;
