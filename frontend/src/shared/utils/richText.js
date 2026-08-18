/**
 * Etkinlik ve proje "content" alanları admin panelinden geliyor ve sayfada
 * HTML olarak render ediliyor. Girdiyi escape etmeden basmak, o alana
 * yazabilen herkese her ziyaretçide script çalıştırma imkânı verir.
 *
 * Bu yüzden sıra önemli: önce gelen metni tamamen escape ediyoruz,
 * sonra yalnızca kendi ürettiğimiz etiketleri geri açıyoruz.
 */

const ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>"']/g, (char) => ESCAPE_MAP[char]);
}

/**
 * Sınırlı markdown benzeri biçimlendirme: **kalın**, "- " madde işareti,
 * boş satırla ayrılmış paragraflar ve satır sonları.
 */
export function markdownishToHtml(text) {
  const safe = escapeHtml(text);

  const withBold = safe.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  const withBullets = withBold.replace(/^-\s+/gm, '• ');

  const paragraphs = withBullets
    .split(/\n\n+/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br/>')}</p>`)
    .join('');

  return paragraphs || '<p></p>';
}
