import {
  DayRoutineTemplate,
  TemplateImportExport,
  TemplateImportExportSchema,
} from '@/types/routine-templates';

export class TemplateIO {
  /**
   * Serializes a DayRoutineTemplate into a standardized JSON string package.
   */
  static exportTemplateAsJson(template: DayRoutineTemplate): string {
    const { userId, ...templateWithoutUserId } = template;
    const pkg: TemplateImportExport = {
      schemaVersion: 1,
      type: 'my_routine_template',
      exportedAt: new Date().toISOString(),
      template: templateWithoutUserId,
    };
    return JSON.stringify(pkg, null, 2);
  }

  /**
   * Triggers a browser download of the template JSON file.
   */
  static downloadTemplateJson(template: DayRoutineTemplate): void {
    if (typeof window === 'undefined') return;
    const jsonStr = this.exportTemplateAsJson(template);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const cleanName = template.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const a = document.createElement('a');
    a.href = url;
    a.download = `routine_template_${cleanName}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  /**
   * Parses and validates a JSON string against TemplateImportExportSchema.
   */
  static parseAndValidateTemplateJson(jsonString: string): {
    success: boolean;
    data?: TemplateImportExport;
    error?: string;
  } {
    try {
      const parsed = JSON.parse(jsonString);
      const validation = TemplateImportExportSchema.safeParse(parsed);
      if (!validation.success) {
        const errorMsg = validation.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
        return {
          success: false,
          error: `Template schema validation failed: ${errorMsg}`,
        };
      }
      return {
        success: true,
        data: validation.data,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Invalid JSON file: ${err?.message || 'Malformed syntax'}`,
      };
    }
  }

  /**
   * Prepares an imported template package for saving, handling ID regeneration,
   * user association, and name collision resolution.
   */
  static prepareImportedTemplate(
    userId: string,
    importedPkg: TemplateImportExport,
    existingTemplates: DayRoutineTemplate[],
    options: { collisionMode: 'copy' | 'overwrite' } = { collisionMode: 'copy' }
  ): DayRoutineTemplate {
    const { template } = importedPkg;
    const now = Date.now();

    const nameCollision = existingTemplates.find(
      (t) => t.name.trim().toLowerCase() === template.name.trim().toLowerCase()
    );

    let templateId: string;
    let templateName: string;

    if (nameCollision && options.collisionMode === 'overwrite') {
      templateId = nameCollision.id;
      templateName = nameCollision.name;
    } else if (nameCollision) {
      templateId = `tpl_${now}_${Math.random().toString(36).substring(2, 7)}`;
      templateName = `${template.name} (Imported)`;
    } else {
      templateId = `tpl_${now}_${Math.random().toString(36).substring(2, 7)}`;
      templateName = template.name;
    }

    // Re-key blocks to ensure unique IDs across routines
    const preparedBlocks = template.blocks.map((block, idx) => ({
      ...block,
      id: `block_${now}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      createdAt: now,
      updatedAt: now,
    }));

    return {
      id: templateId,
      userId,
      name: templateName,
      description: template.description ?? '',
      color: template.color || '#3b82f6',
      icon: template.icon || 'calendar',
      blocks: preparedBlocks,
      isDefault: false,
      schemaVersion: 1,
      createdAt: now,
      updatedAt: now,
    };
  }
}
