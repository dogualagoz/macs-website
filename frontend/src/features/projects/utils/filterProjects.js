/**
 * Projeler sayfasının filtre kuralları.
 *
 * Sekmeler tür filtresidir; "all" sekmesi türe bakmaz ve tüm projeleri
 * gösterir. Canlıda 23 projenin 10'u Developed, 1'i Supported, 12'si Member
 * Showcase: eskiden varsayılan sekme Developed olduğu için sayfada yalnızca
 * 10 proje görünüyordu.
 */
export const ALL_TAB = 'all';

const TAB_TO_TYPE = {
  developed: 'DEVELOPED_BY_MACS',
  supported: 'SUPPORTED_BY_MACS',
  showcase: 'MEMBER_SHOWCASE',
};

export const matchesTab = (project, tab) => {
  if (tab === ALL_TAB) return true;
  // project_type veya tab ile eşleştir (mock data için geriye uyumluluk)
  const type = project.project_type || (project.tab ? TAB_TO_TYPE[project.tab] : null);
  return type === TAB_TO_TYPE[tab] || project.tab === tab;
};

const matchesSearch = (project, query) => {
  const needle = query.toLowerCase();
  return (project.title || '').toLowerCase().includes(needle)
    || (project.tags || []).some((tag) => tag.toLowerCase().includes(needle));
};

const matchesCategory = (project, category) =>
  category === 'All' || project.category?.name === category || project.category === category;

export const filterProjects = (projects, { tab, search, category }) =>
  projects.filter((project) =>
    matchesTab(project, tab) && matchesSearch(project, search) && matchesCategory(project, category));

/** Sekme başına proje sayısı (arama ve kategoriden bağımsız). */
export const countByTab = (projects, tabIds) =>
  Object.fromEntries(tabIds.map((id) => [id, projects.filter((project) => matchesTab(project, id)).length]));
