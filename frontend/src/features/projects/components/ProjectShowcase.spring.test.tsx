import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProjectShowcase, ShowcaseProject } from './ProjectShowcase';

const projects: ShowcaseProject[] = Array.from({ length: 7 }, (_, index) => ({
  id: index,
  slug: `project-${index}`,
  title: `Project ${index}`,
  shortDescription: `Description ${index}`,
  imageUrl: `/project-${index}.png`,
}));

const offsetOf = (title: string) =>
  Number(screen.getByText(title, { selector: 'h2' }).closest('article')?.style.getPropertyValue('--offset'));

test('kartlar hedefe yayla yaklaşır: hemen değil, sonunda tam oturur', async () => {
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ProjectShowcase projects={projects} />
    </MemoryRouter>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Project 2 projesini öne getir' }));
  // Hedef anında değişir (aktif bağlantı), kart konumu ise yayla gelir.
  expect(screen.getByRole('link', { name: /Projeyi incele/ }).getAttribute('href')).toBe('/projeler/project-2');
  expect(Math.abs(offsetOf('Project 0') + 2)).toBeGreaterThan(0.5);
  await waitFor(() => expect(offsetOf('Project 0')).toBe(-2), { timeout: 5000 });
  expect(offsetOf('Project 2')).toBe(0);
});
