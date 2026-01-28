export type ProjectCategory = 'Web' | 'Mobil' | 'Yapay Zeka' | 'Oyun' | 'Veri Bilimi' | 'Diğer';

export type ProjectStatus = 'Yayında' | 'Geliştirme Aşamasında' | 'Bakımda' | 'Tamamlandı';

export type ProjectTab = 'developed' | 'supported' | 'showcase';

export interface TeamMember {
  name: string;
  role: string;
  avatar: string;
}

export interface Project {
  id: string;
  title: string;
  shortDescription: string;
  longDescription: string;
  imageUrl: string;
  category: ProjectCategory;
  tags: string[];
  status: ProjectStatus;
  date: string;
  team: TeamMember[];
  githubUrl?: string;
  liveUrl?: string;
  tab: ProjectTab; // Which tab this belongs to
  featured?: boolean;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  projectCount: number;
  role: string;
}