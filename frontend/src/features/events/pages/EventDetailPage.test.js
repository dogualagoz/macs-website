import { splitContent, parseProgram } from './EventDetailPage';

describe('event content parsing', () => {
  test('markdown "## Program" heading splits about and program', () => {
    const { aboutHtml, programLines } = splitContent(
      '## Hakkında\nAçıklama\n\n## Program\n09:30 - Açılış\n10:00 - Keynote'
    );
    expect(aboutHtml).toContain('Açıklama');
    expect(programLines).toHaveLength(2);

    const items = parseProgram(programLines, new Date('2025-10-25T09:00:00+03:00'));
    expect(items[0].title).toContain('Açılış');
  });

  test('HTML <h2>Program</h2> heading is recognised', () => {
    expect(splitContent('<h2>Hakkında</h2><p>X</p><h2>Program</h2>09:00 - Y').programLines).toHaveLength(1);
  });

  test('plain "PROGRAM:" marker is recognised', () => {
    expect(splitContent('Hakkında metin\n\nPROGRAM:\n09:15 Z').programLines).toHaveLength(1);
  });

  test('about text is escaped before rendering', () => {
    expect(splitContent('<img src=x onerror=alert(1)>').aboutHtml).not.toContain('<img');
  });
});
