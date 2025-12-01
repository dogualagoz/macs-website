import '../../../styles/components/team.css'

import React from "react";
const people_data = {
  BerkeZerelgil: {member: "Berke Zerelgil",
  role: "Kulüp Başkanı",
  graduate: "Matematik ve Bilgisayar Bilimleri 4. Sınıf",
  bio: "Designer ve Uygulama Geliştirme odaklı, MACS kulübü ekip lideri",
  pic: "/assets/images/profiles/berkepp.jpeg" },
 
  EfeAltun: {member: "Efe Altın",
    role: "Kulüp Başkan Yardımcısı",
    graduate: "Matematik ve Bilgisayar Bilimleri 3. Sınıf",
    bio: "AI geliştirme odaklı",
    pic: "/assets/images/profiles/efepp.jpeg"
  },

  YigitYucel: {member: "Yiğit Yücel",
    role: "Genel Koordinatör",
    graduate: "Matematik ve Bilgisayar Bilimleri 3. Sınıf",
    bio: "Siber güvenlik odaklı",
    pic: "/assets/images/profiles/yigitpp.jpeg"
  },
 
  DoguAlagoz: {member: "Doğu Alagöz",
    role: "Proje Koordinatörlüğü",
    graduate: "Matematik ve Bilgisayar Bilimleri 3. Sınıf",
    bio: "Backend developer ve Mobil geliştirme odaklı",
    pic: "/assets/images/profiles/dogupp.jpeg"
  },
  
  KeremAlagoz: {member: "Kerem Alagöz",
    role: "Proje Koordinatörlüğü",
    graduate: "Matematik ve Bilgisayar Bilimleri 3. Sınıf",
    bio: "AI geliştirme odaklı",
    pic: "/assets/images/profiles/kerempp.jpeg"
  },
  HiraYilmaz: {member: "Hira Yılmaz",
    role: "Denetim Koordinatörlüğü",
    graduate: "Matematik ve Bilgisayar Bilimleri 3. Sınıf",
    bio: "Oyun geliştirme odaklı",
    pic: "/assets/images/profiles/hirapp.jpg"
  },
  ErenAlpaslan: {member: "Eren Alpaslan",
    role: "Denetim Koordinatörlüğü",
    graduate: "Matematik ve Bilgisayar Bilimleri 3. Sınıf",
    bio: "AI geliştirme odaklı",
    pic: "/assets/images/profiles/erenpp.jpeg"
  },
  
 
  LeylaMammadova: {member: "Leyla Mammadova",
    role: "Kurumsal İletişim Koordinatörlüğü",
    graduate: "Matematik ve Bilgisayar Bilimleri 4. Sınıf",
    bio: "Frontend geliştirme odaklı",
    pic: "/assets/images/profiles/leylapp.jpg"
  },
 
  AzraUskup: {member:"Azra Üsküp",
    role: "Genel Sekreter",
    graduate: "Matematik ve Bilgisayar Bilimleri 3. Sınıf",
    bio: "Python Geliştirme odaklı",
    pic: "/assets/images/profiles/azrapp.jpeg"
  },
 
  AliErdemGecgel: {member: "Ali Erdem Geçgel",
    role: "Halkla İlişkiler",
    graduate: "Matematik ve Bilgisayar Bilimleri 4. Sınıf",
    bio:"Oyun Geliştirme odaklı",
    pic: "/assets/images/profiles/erdempp.jpeg"
  },
 
  AhsenAslan: {member: "Ahsen Aslan",
    role: "Tasarım ve Sosyal Medya Koordinatörlüğü",
    graduate: "Matematik ve Bilgisayar Bilimleri 2. Sınıf",
    bio: "Python Geliştirme odaklı",
    pic: "/assets/images/profiles/ahsenpp.JPG"
  },
  CagriAri: {member: "Çağrı Arı",
    role: "Tasarım ve Sosyal Medya Koordinatörlüğü",
    graduate: "Matematik ve Bilgisayar Bilimleri 3. Sınıf",
    bio: "Oyun Geliştirme odaklı",
    pic: "/assets/images/profiles/cagripp.JPG"
  }
 
 }
 
 const TeamSection = () => {
  const people = Object.values(people_data);
   return (
     <section className="team-section" style={{ cursor: "default" }}>
        
       <div className="container">
         <h2 className="section-title">Yönetim Ekibimizle Tanışın</h2>
         <p className="section-subtitle">
           MACS topluluğunu yöneten deneyimli ve tutkulu, matematik ve bilgisayar
           bilimleri alanında yenilikçi projeler geliştiren yönetim ekibimiz.
         </p>
 
         <div className="team-grid">
           {people.map((p, index) => (
             <div className="team-member" key={index}>
               <div
                 className="member-avatar"
                 style={{ cursor: "pointer", backgroundImage: `url(${p.pic || '/assets/images/avatar-placeholder.png'})` }}
               ></div>
               
               <h3 className="member-name">{p.member}</h3>
               <p className="member-role">{p.role}</p>
               <p className="member-department">
                 {p.graduate}
               </p>
               <p className="member-bio">
                 {p.bio}
               </p>
               <div className="member-social">
                 <img src="/assets/images/img_linkedin.png" alt="LinkedIn" />
                 <img src="/assets/images/img_github_18x17.png" alt="GitHub" />
                 <img
                   src="/assets/images/img_instagram_circle.png"
                   alt="Instagram"
                 />
                 <img src="/assets/images/img_email.png" alt="Email" />
               </div>
             </div>
           ))}
         </div>
 
         <div className="text-center">
           <button type="button" className="view-more-team" aria-label="Daha fazla ekip üyesi göster">
             <span>Daha fazla</span>
             <img src="/assets/images/img_vector.svg" alt="Arrow" />
           </button>
         </div>
       </div>
     </section>
   );
 };
 
 export default TeamSection;
