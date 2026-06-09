import type { Project } from '@/slices/projects/reducer'

/** Building · Location · Floor — omits empty segments. */
export function formatProjectSite(project: Pick<Project, 'building' | 'location' | 'floor'>): string {
  return [project.building, project.location, project.floor].filter(Boolean).join(' · ')
}
