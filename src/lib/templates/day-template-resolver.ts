import { DayRoutineTemplate, WeeklyPlannerConfig } from '@/types/routine-templates';
import { RoutineTemplate } from '@/types/routine';
import { getDayOfWeek } from '@/lib/time-utils';

export type TemplateResolutionSource =
  | 'date_override'
  | 'weekly_assignment'
  | 'default_fallback'
  | 'first_available'
  | 'none';

export interface ResolvedDayTemplate {
  template: DayRoutineTemplate | null;
  source: TemplateResolutionSource;
}

export class DayTemplateResolver {
  /**
   * Resolves the active DayRoutineTemplate for a given date according to deterministic precedence:
   * 1. Date-specific template override (weeklyPlanner.dateOverrides[dateStr])
   * 2. Weekly planner weekday assignment (weeklyPlanner.assignments[dayOfWeek])
   * 3. Configured default fallback template (weeklyPlanner.defaultTemplateId)
   * 4. First available / default template
   */
  static resolveTemplateForDate(
    dateStr: string,
    planner: WeeklyPlannerConfig,
    templates: DayRoutineTemplate[]
  ): ResolvedDayTemplate {
    if (!templates || templates.length === 0) {
      return { template: null, source: 'none' };
    }

    const templateMap = new Map<string, DayRoutineTemplate>();
    templates.forEach((t) => templateMap.set(t.id, t));

    // Tier 2: Date-specific template override
    const dateOverrideId = planner?.dateOverrides?.[dateStr];
    if (dateOverrideId && templateMap.has(dateOverrideId)) {
      return {
        template: templateMap.get(dateOverrideId)!,
        source: 'date_override',
      };
    }

    // Tier 3: Weekly day assignment (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const dayOfWeek = getDayOfWeek(dateStr);
    const dayAssignmentId = planner?.assignments?.[String(dayOfWeek)];
    if (dayAssignmentId && templateMap.has(dayAssignmentId)) {
      return {
        template: templateMap.get(dayAssignmentId)!,
        source: 'weekly_assignment',
      };
    }

    // Tier 4: Configured default fallback template
    if (planner?.defaultTemplateId && templateMap.has(planner.defaultTemplateId)) {
      return {
        template: templateMap.get(planner.defaultTemplateId)!,
        source: 'default_fallback',
      };
    }

    // Fallback: Default template or first available template
    const defaultTemplate = templates.find((t) => t.isDefault) || templates[0] || null;
    return {
      template: defaultTemplate,
      source: defaultTemplate ? 'first_available' : 'none',
    };
  }

  /**
   * Resolves the constituent RoutineTemplate activity blocks for a given date.
   */
  static resolveBlocksForDate(
    dateStr: string,
    planner: WeeklyPlannerConfig,
    templates: DayRoutineTemplate[]
  ): RoutineTemplate[] {
    const { template } = this.resolveTemplateForDate(dateStr, planner, templates);
    return template?.blocks ?? [];
  }
}
