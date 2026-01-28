/**
 * Mock Events Data
 * Backend'den veri gelmediğinde veya hata durumunda kullanılacak yedek veri
 */

export const mockEventCategories = [
  { id: 1, name: "Workshop", slug: "workshop" },
  { id: 2, name: "Seminer", slug: "seminer" },
  { id: 3, name: "Etkinlik", slug: "etkinlik" },
  { id: 4, name: "Hackathon", slug: "hackathon" },
];

export const mockEvents = [
  {
    id: 1,
    title: "MACS's LOG 2025",
    slug: "macs-s-log-2025",
    description: "Birbirinden değerli konuşmacılarla kariyer, yazılım ve topluluk kültürü üzerine ilham verici bir gün.",
    content: `## Hakkında\nMACS's LOG; geliştirme kültürü, topluluk yönetimi ve kariyer yolculuklarına odaklanan bir etkinliktir.\nGün boyunca **atölyeler**, **konferanslar** ve **networking** oturumları yer alacaktır.\n\n## Program\n09:30 - Kayıt & Karşılama\n10:00 - Açılış Konuşması\n11:30 - Keynote\n13:30 - Öğle Arası\n14:30 - Atölyeler\n16:30 - Kapanış & Networking`,
    image_url: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=1600&auto=format&fit=crop",
    location: "Osmangazi Üniversitesi F-1 Binası",
    start_time: "2025-10-25T09:30:00+03:00",
    end_time: "2025-10-25T17:00:00+03:00",
    category_id: 3,
    category: { id: 3, name: "Etkinlik" },
    created_by: 7,
    creator: { id: 7, name: "MACS Ekibi" },
    is_active: true,
    is_deleted: false,
    is_featured: true,
  },
  {
    id: 2,
    title: "Python Workshop",
    slug: "python-workshop",
    description: "Python programlama diline giriş yapacağımız interaktif bir workshop.",
    content: "Python'un temellerini öğreneceğimiz, uygulamalı bir atölye çalışması.",
    image_url: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?q=80&w=1600&auto=format&fit=crop",
    location: "Online - Zoom",
    start_time: "2025-11-15T14:00:00+03:00",
    end_time: "2025-11-15T17:00:00+03:00",
    category_id: 1,
    category: { id: 1, name: "Workshop" },
    created_by: 7,
    creator: { id: 7, name: "MACS Ekibi" },
    is_active: true,
    is_deleted: false,
    is_featured: false,
  },
  {
    id: 3,
    title: "Yapay Zeka Semineri",
    slug: "yapay-zeka-semineri",
    description: "Yapay zeka ve makine öğrenmesi alanındaki son gelişmeleri konuşacağımız bir seminer.",
    content: "AI ve ML dünyasındaki yenilikleri keşfedeceğimiz bir seminer.",
    image_url: "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=1600&auto=format&fit=crop",
    location: "Mühendislik Fakültesi Konferans Salonu",
    start_time: "2025-12-01T10:00:00+03:00",
    end_time: "2025-12-01T12:00:00+03:00",
    category_id: 2,
    category: { id: 2, name: "Seminer" },
    created_by: 7,
    creator: { id: 7, name: "MACS Ekibi" },
    is_active: true,
    is_deleted: false,
    is_featured: false,
  },
];

export default mockEvents;
