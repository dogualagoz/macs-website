import { Project, User } from './types';

export const USERS: User[] = [
  { id: '1', name: 'Berke Zerelgil', avatar: 'https://picsum.photos/100/100?random=1', projectCount: 12, role: 'Başkan' },
  { id: '2', name: 'Eren Alpaslan', avatar: 'https://picsum.photos/100/100?random=2', projectCount: 8, role: 'Core Team' },
  { id: '3', name: 'Kerem Alagöz', avatar: 'https://picsum.photos/100/100?random=3', projectCount: 6, role: 'Üye' },
  { id: '4', name: 'Enes Dursun', avatar: 'https://picsum.photos/100/100?random=4', projectCount: 5, role: 'Üye' },
  { id: '5', name: 'Ayşe Yıldız', avatar: 'https://picsum.photos/100/100?random=5', projectCount: 4, role: 'Üye' },
];

export const PROJECTS: Project[] = [
  {
    id: 'sentinel-ai',
    title: 'Sentinel AI',
    shortDescription: 'Linux terminalleri için akıllı agent aracı.',
    longDescription: 'Sentinel AI, Linux kullanıcılarının terminal deneyimini iyileştirmek için tasarlanmış yapay zeka tabanlı bir yardımcıdır. Doğal dil işleme yetenekleri sayesinde komutları açıklar, hataları analiz eder ve karmaşık bash scriptlerini otomatik olarak oluşturabilir. Docker container mimarisi üzerinde çalışan Sentinel, güvenli ve izole bir ortam sunar.',
    imageUrl: 'https://picsum.photos/800/600?random=10',
    category: 'Yapay Zeka',
    tags: ['Python', 'Docker', 'Bash', 'Ollama', 'PyQt6'],
    status: 'Yayında',
    date: '15 Ocak 2024',
    team: [USERS[0], USERS[1]],
    githubUrl: 'https://github.com/macs/sentinel',
    tab: 'developed',
    featured: true
  },
  {
    id: 'codabrate',
    title: 'CodaBrate',
    shortDescription: 'Üniversite öğrencileri için proje partneri bulma platformu.',
    longDescription: 'CodaBrate, yazılım projeleri geliştirmek isteyen öğrencileri yeteneklerine ve ilgi alanlarına göre eşleştiren bir sosyal ağdır. Profil oluşturma, portfolyo sergileme ve takım kurma özellikleriyle kampüs içi işbirliğini artırmayı hedefler.',
    imageUrl: 'https://picsum.photos/800/600?random=11',
    category: 'Web',
    tags: ['Next.js', 'React', 'Tailwind', 'Supabase', 'PostgreSQL'],
    status: 'Geliştirme Aşamasında',
    date: '20 Aralık 2023',
    team: [USERS[1], USERS[4]],
    liveUrl: 'https://codabrate.com',
    tab: 'developed'
  },
  {
    id: 'endless-zombie',
    title: 'Endless Zombie',
    shortDescription: '2D Masaüstü Platform hayatta kalma oyunu.',
    longDescription: 'Karanlık bir atmosferde geçen, dalga tabanlı bir zombi hayatta kalma oyunu. Oyuncular farklı silahlar ve yetenekler kullanarak giderek zorlaşan düşmanlara karşı mücadele ederler. Unity oyun motoru ile geliştirilmiş olup, dinamik ışıklandırma ve parçacık efektleri içerir.',
    imageUrl: 'https://picsum.photos/800/600?random=12',
    category: 'Oyun',
    tags: ['Unity', 'C#', '2D Art', 'Physics'],
    status: 'Tamamlandı',
    date: '10 Kasım 2023',
    team: [USERS[3]],
    githubUrl: 'https://github.com/macs/zombie',
    tab: 'supported'
  },
  {
    id: 'macs-menu',
    title: 'MACS Menü Otopilotu',
    shortDescription: 'Yemekhane menüsünü Instagram hikayelerde paylaşan bot.',
    longDescription: 'Üniversite yemekhanesinin web sitesinden günlük menüyü scraplayıp, estetik bir şablon üzerine yerleştirerek otomatik olarak kulüp Instagram hesabında hikaye olarak paylaşan Python tabanlı otomasyon sistemi.',
    imageUrl: 'https://picsum.photos/800/600?random=13',
    category: 'Yapay Zeka',
    tags: ['Python', 'Selenium', 'Instagram Graph API', 'Cron'],
    status: 'Yayında',
    date: '01 Ekim 2023',
    team: [USERS[2]],
    githubUrl: 'https://github.com/macs/menu-bot',
    tab: 'developed'
  },
  {
    id: 'kampus-rehberi',
    title: 'ESOGÜ Kampüs Rehberi',
    shortDescription: 'Yeni gelen öğrenciler için interaktif harita ve rehber.',
    longDescription: 'Kampüsteki binaları, yemekhaneleri ve önemli noktaları gösteren mobil uyumlu web uygulaması.',
    imageUrl: 'https://picsum.photos/800/600?random=14',
    category: 'Mobil',
    tags: ['React Native', 'Firebase', 'Google Maps API'],
    status: 'Geliştirme Aşamasında',
    date: '05 Şubat 2024',
    team: [USERS[0], USERS[2], USERS[4]],
    tab: 'supported'
  },
  {
    id: 'kisisel-blog',
    title: 'DevDiary Blog',
    shortDescription: 'Bir üyenin kişisel teknoloji bloğu.',
    longDescription: 'Markdown tabanlı, yüksek performanslı kişisel blog.',
    imageUrl: 'https://picsum.photos/800/600?random=15',
    category: 'Web',
    tags: ['Astro', 'TypeScript'],
    status: 'Yayında',
    date: '12 Mart 2024',
    team: [USERS[3]],
    liveUrl: 'https://example.com',
    tab: 'showcase'
  }
];