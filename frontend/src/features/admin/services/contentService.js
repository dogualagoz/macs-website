/**
 * Content Service (Admin)
 * Re-exports event and project services for admin features
 * This keeps backward compatibility for admin components
 */
import eventService from '../../../shared/services/api/eventService';
import projectService from '../../../shared/services/api/projectService';

export { eventService, projectService };
