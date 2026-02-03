/**
 * Mock Projects Data
 * Backend'den veri gelmediğinde veya hata durumunda kullanılacak yedek veri
 */

export const mockProjectCategories = [
  { id: 1, name: "Web", slug: "web" },
  { id: 2, name: "Mobil", slug: "mobil" },
  { id: 3, name: "Yapay Zeka", slug: "yapay-zeka" },
  { id: 4, name: "Oyun", slug: "oyun" },
];

export const mockProjects = [
  {
    id: 1,
    title: "MACS Website",
    slug: "macs-website",
    description: "MACS Kulübü'nün resmi web sitesi. React ve FastAPI ile geliştirildi.",
    content: `## Proje Hakkında\nMACS Kulübü'nün resmi web sitesi projesidir.\n\n**Özellikler**\n- Etkinlik yönetimi\n- Proje portföyü\n- Üye sistemi\n- Admin paneli`,
    image_url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1600&auto=format&fit=crop",
    github_url: "https://github.com/macs-club/macs-website",
    live_url: "https://macsclub.com.tr",
    status: "IN_PROGRESS",
    category_id: 1,
    category: { id: 1, name: "Web" },
    created_by: 7,
    creator: { id: 7, name: "MACS Ekibi" },
    team_members: "Doğu, Yusuf, Kerem",
    technologies: "React, FastAPI, PostgreSQL",
    created_at: "2025-01-01",
    is_active: true,
    is_featured: true,
    project_type: 'DEVELOPED_BY_MACS'
  },
  {
    id: 2,
    title: "AI Chatbot",
    slug: "ai-chatbot",
    description: "Kulüp etkinlikleri hakkında bilgi veren yapay zeka destekli sohbet botu.",
    content: "Doğal dil işleme kullanarak kulüp hakkında soruları yanıtlayan bir chatbot.",
    image_url: "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=1600&auto=format&fit=crop",
    github_url: "https://github.com/macs-club/ai-chatbot",
    live_url: null,
    status: "PLANNING",
    category_id: 3,
    category: { id: 3, name: "Yapay Zeka" },
    created_by: 7,
    creator: { id: 7, name: "MACS Ekibi" },
    team_members: "Ali, Veli",
    technologies: "Python, TensorFlow, FastAPI",
    created_at: "2025-02-15",
    is_active: true,
    is_featured: false,
    project_type: 'SUPPORTED_BY_MACS'
  },
  {
    id: 3,
    title: "MACS Mobile App",
    slug: "macs-mobile-app",
    description: "MACS Kulübü mobil uygulaması. Flutter ile geliştirildi.",
    content: "iOS ve Android için geliştirilen kulüp mobil uygulaması.",
    image_url: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?q=80&w=1600&auto=format&fit=crop",
    github_url: "https://github.com/macs-club/macs-mobile",
    live_url: null,
    status: "COMPLETED",
    category_id: 2,
    category: { id: 2, name: "Mobil" },
    created_by: 7,
    creator: { id: 7, name: "MACS Ekibi" },
    team_members: "Mehmet, Ayşe",
    technologies: "Flutter, Dart, Firebase",
    created_at: "2024-09-01",
    is_active: true,
    is_featured: false,
    project_type: 'MEMBER_SHOWCASE'
  },
];

export default mockProjects;
