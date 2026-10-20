import { describe, it, expect, beforeEach } from 'vitest';
import { LifeGoalRepository } from './life-goal-repository';
import { getInitialLifeGoals } from '@/lib/seed-goals';
import { BackupService } from '@/lib/sync/backup-service';
import { LifeGoal } from '@/types/goals';

describe('Personal and Professional Life Goals System', () => {
  const userId = 'test-life-goals-user';

  beforeEach(() => {
    localStorage.clear();
  });

  it('provides default initial goals matching user requirements', () => {
    const defaultGoals = getInitialLifeGoals(userId);
    expect(defaultGoals.length).toBeGreaterThanOrEqual(3);

    const readingGoal = defaultGoals.find((g) => g.title.includes('Read 30 books'));
    expect(readingGoal).toBeDefined();
    expect(readingGoal?.domain).toBe('personal');
    expect(readingGoal?.category).toBe('reading');
    expect(readingGoal?.targetValue).toBe(30);
    expect(readingGoal?.unit).toBe('books');

    const courseGoal = defaultGoals.find((g) => g.title.includes('Generative AI'));
    expect(courseGoal).toBeDefined();
    expect(courseGoal?.domain).toBe('professional');
    expect(courseGoal?.category).toBe('education');
    expect(courseGoal?.metricType).toBe('milestone');
    expect(courseGoal?.milestones?.length).toBe(5);

    const weightGoal = defaultGoals.find((g) => g.title.includes('Lose 5 kg'));
    expect(weightGoal).toBeDefined();
    expect(weightGoal?.domain).toBe('personal');
    expect(weightGoal?.category).toBe('health_fitness');
    expect(weightGoal?.targetValue).toBe(5);
    expect(weightGoal?.unit).toBe('kg');
  });

  it('saves and retrieves a newly created life goal', async () => {
    const newGoal: LifeGoal = {
      id: 'test_goal_aws_cert',
      userId,
      title: 'Pass AWS Solutions Architect Professional in 2 months',
      description: 'Study 1 hour daily and take practice exams',
      domain: 'professional',
      category: 'education',
      metricType: 'numeric',
      startValue: 0,
      currentValue: 12,
      targetValue: 60,
      unit: 'hours',
      milestones: [],
      startDate: '2026-10-01',
      targetDate: '2026-12-01',
      timeframeLabel: '2 months',
      progressLogs: [],
      status: 'in_progress',
      priority: 'high',
      color: '#3b82f6',
      linkedTemplateIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const saved = await LifeGoalRepository.saveGoal(newGoal);
    expect(saved.id).toBe('test_goal_aws_cert');

    const all = LifeGoalRepository.getLocalLifeGoals(userId);
    const found = all.find((g) => g.id === 'test_goal_aws_cert');
    expect(found).toBeDefined();
    expect(found?.title).toBe('Pass AWS Solutions Architect Professional in 2 months');
  });

  it('logs progress increments, adds journal entry, and auto-completes upon reaching target', async () => {
    const goal: LifeGoal = {
      id: 'test_goal_books',
      userId,
      title: 'Read 5 books',
      domain: 'personal',
      category: 'reading',
      metricType: 'numeric',
      startValue: 0,
      currentValue: 3,
      targetValue: 5,
      unit: 'books',
      milestones: [],
      startDate: '2026-10-01',
      targetDate: '2026-12-31',
      progressLogs: [],
      status: 'in_progress',
      priority: 'medium',
      color: '#8b5cf6',
      linkedTemplateIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await LifeGoalRepository.saveGoal(goal);

    // Log progress (+1 book)
    const updated = await LifeGoalRepository.logProgress(
      userId,
      'test_goal_books',
      1,
      'Finished "Thinking in Systems"',
      '2026-10-20'
    );
    expect(updated?.currentValue).toBe(4);
    expect(updated?.status).toBe('in_progress');
    expect(updated?.progressLogs.length).toBe(1);
    expect(updated?.progressLogs[0].note).toBe('Finished "Thinking in Systems"');

    // Log progress (+1 book to reach target 5)
    const completed = await LifeGoalRepository.logProgress(
      userId,
      'test_goal_books',
      1,
      'Finished "Clean Code"',
      '2026-10-25'
    );
    expect(completed?.currentValue).toBe(5);
    expect(completed?.status).toBe('completed');
  });

  it('toggles milestones and updates progress count dynamically', async () => {
    const milestoneGoal: LifeGoal = {
      id: 'test_goal_course',
      userId,
      title: 'Complete 3 Course Modules',
      domain: 'professional',
      category: 'education',
      metricType: 'milestone',
      startValue: 0,
      currentValue: 0,
      targetValue: 3,
      unit: 'modules',
      milestones: [
        { id: 'm1', title: 'Module 1', isCompleted: false },
        { id: 'm2', title: 'Module 2', isCompleted: false },
        { id: 'm3', title: 'Module 3', isCompleted: false },
      ],
      startDate: '2026-10-01',
      targetDate: '2026-11-30',
      progressLogs: [],
      status: 'in_progress',
      priority: 'high',
      color: '#3b82f6',
      linkedTemplateIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await LifeGoalRepository.saveGoal(milestoneGoal);

    // Toggle module 1
    const step1 = await LifeGoalRepository.toggleMilestone(userId, 'test_goal_course', 'm1');
    expect(step1?.currentValue).toBe(1);
    expect(step1?.milestones?.[0].isCompleted).toBe(true);
    expect(step1?.status).toBe('in_progress');

    // Toggle modules 2 and 3
    await LifeGoalRepository.toggleMilestone(userId, 'test_goal_course', 'm2');
    const allDone = await LifeGoalRepository.toggleMilestone(userId, 'test_goal_course', 'm3');
    expect(allDone?.currentValue).toBe(3);
    expect(allDone?.status).toBe('completed');
  });

  it('deletes a life goal cleanly', async () => {
    const goal: LifeGoal = {
      id: 'goal_to_delete',
      userId,
      title: 'Temporary Goal',
      domain: 'personal',
      category: 'lifestyle',
      metricType: 'numeric',
      startValue: 0,
      currentValue: 1,
      targetValue: 10,
      unit: 'units',
      milestones: [],
      startDate: '2026-10-01',
      targetDate: '2026-11-01',
      progressLogs: [],
      status: 'in_progress',
      priority: 'low',
      color: '#10b981',
      linkedTemplateIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await LifeGoalRepository.saveGoal(goal);

    await LifeGoalRepository.deleteGoal(userId, 'goal_to_delete');
    const remaining = LifeGoalRepository.getLocalLifeGoals(userId);
    expect(remaining.find((g) => g.id === 'goal_to_delete')).toBeUndefined();
  });

  it('exports and restores life goals via BackupService', () => {
    const backup = BackupService.exportAllData(userId);
    expect(backup.lifeGoals).toBeDefined();
    expect(backup.lifeGoals?.length).toBeGreaterThanOrEqual(3);

    // Test import
    const rawJson = JSON.stringify(backup);
    const result = BackupService.importBackupData(userId, rawJson, 'replace');
    expect(result.success).toBe(true);
  });

  it('manages goal checklist items (add, toggle, and delete)', async () => {
    const defaultGoals = getInitialLifeGoals(userId);
    const bookGoal = defaultGoals[0];

    // Add item
    const afterAdd = await LifeGoalRepository.addChecklistItem(
      userId,
      bookGoal.id,
      'Read 25 pages before bedtime'
    );
    expect(afterAdd).toBeDefined();
    const addedItem = afterAdd?.checklist?.find((c) => c.text === 'Read 25 pages before bedtime');
    expect(addedItem).toBeDefined();
    expect(addedItem?.isCompleted).toBe(false);

    // Toggle item
    const afterToggle = await LifeGoalRepository.toggleChecklistItem(
      userId,
      bookGoal.id,
      addedItem!.id
    );
    const toggled = afterToggle?.checklist?.find((c) => c.id === addedItem!.id);
    expect(toggled?.isCompleted).toBe(true);
    expect(toggled?.completedAt).toBeDefined();

    // Delete item
    const afterDelete = await LifeGoalRepository.deleteChecklistItem(
      userId,
      bookGoal.id,
      addedItem!.id
    );
    expect(afterDelete?.checklist?.find((c) => c.id === addedItem!.id)).toBeUndefined();
  });

  it('manages goal comments and reflections (add, edit, and delete)', async () => {
    const defaultGoals = getInitialLifeGoals(userId);
    const bookGoal = defaultGoals[0];

    // Add comment
    const afterAdd = await LifeGoalRepository.addGoalComment(
      userId,
      bookGoal.id,
      'Started reading Deep Work by Cal Newport today.'
    );
    expect(afterAdd).toBeDefined();
    const comment = afterAdd?.comments?.find((c) => c.text.includes('Deep Work'));
    expect(comment).toBeDefined();
    expect(comment?.createdAt).toBeGreaterThan(0);

    // Edit comment
    const afterEdit = await LifeGoalRepository.updateGoalComment(
      userId,
      bookGoal.id,
      comment!.id,
      'Finished Chapter 1 of Deep Work.'
    );
    const edited = afterEdit?.comments?.find((c) => c.id === comment!.id);
    expect(edited?.text).toBe('Finished Chapter 1 of Deep Work.');
    expect(edited?.updatedAt).toBeDefined();

    // Delete comment
    const afterDelete = await LifeGoalRepository.deleteGoalComment(
      userId,
      bookGoal.id,
      comment!.id
    );
    expect(afterDelete?.comments?.find((c) => c.id === comment!.id)).toBeUndefined();
  });

  it('records daily activity history and increments progress', async () => {
    const defaultGoals = getInitialLifeGoals(userId);
    const bookGoal = defaultGoals[0];
    const initialProgress = bookGoal.currentValue;

    // Record activity on specific date
    const updated = await LifeGoalRepository.recordActivityForGoal(userId, bookGoal.id, {
      date: '2026-10-20',
      activityTitle: 'Evening Mindful Reading Session',
      durationMinutes: 45,
      notes: 'Read chapters 3 & 4 of Atomic Habits',
      incrementProgress: true,
    });

    expect(updated).toBeDefined();
    expect(updated?.currentValue).toBe(initialProgress + 1);
    expect(updated?.activityRecords).toBeDefined();
    expect(updated?.activityRecords?.length).toBeGreaterThanOrEqual(1);

    const latestActivity = updated?.activityRecords?.[0];
    expect(latestActivity?.date).toBe('2026-10-20');
    expect(latestActivity?.activityTitle).toBe('Evening Mindful Reading Session');
    expect(latestActivity?.durationMinutes).toBe(45);
    expect(latestActivity?.notes).toBe('Read chapters 3 & 4 of Atomic Habits');
  });

  it('syncs completed daily routine activity to matching linked life goals', async () => {
    const defaultGoals = getInitialLifeGoals(userId);
    const readingGoal = defaultGoals.find((g) => g.linkedTemplateIds?.includes('template_mindvalley'));
    expect(readingGoal).toBeDefined();

    const initialLogsCount = readingGoal?.activityRecords?.length || 0;

    // Trigger routine sync
    const syncedGoals = await LifeGoalRepository.syncCompletedRoutineToLifeGoals(
      userId,
      '2026-10-20',
      'template_mindvalley',
      'Mindvalley Daily Routine & Meditation',
      45,
      'Finished day 12 session'
    );

    expect(syncedGoals.length).toBeGreaterThanOrEqual(1);
    const synced = syncedGoals.find((g) => g.id === readingGoal!.id);
    expect(synced).toBeDefined();
    expect(synced?.activityRecords?.length).toBe(initialLogsCount + 1);

    const latest = synced?.activityRecords?.[0];
    expect(latest?.activityTitle).toBe('Mindvalley Daily Routine & Meditation');
    expect(latest?.durationMinutes).toBe(45);
    expect(latest?.date).toBe('2026-10-20');
  });

  it('manages flexible tracked items (books with pages, summary, audiobook link, local file path)', async () => {
    const defaultGoals = getInitialLifeGoals(userId);
    const readingGoal = defaultGoals[0];

    // Add a new book
    const afterAdd = await LifeGoalRepository.addTrackedItem(userId, readingGoal.id, {
      title: 'Show Your Work!',
      itemType: 'book',
      authorOrInstructor: 'Austin Kleon',
      status: 'in_progress',
      currentUnits: 40,
      totalUnits: 224,
      unitLabel: 'pages',
      summary: '10 ways to share your creativity and get discovered. Teach what you know.',
      notes: 'Key takeaway: document your process instead of waiting for finished perfection.',
      audioLinkOrPath: 'https://www.audible.com/pd/Show-Your-Work-Audiobook/B00J81LQ3K',
      localFilePath: 'C:/Users/YogeshMurdeshwar/Books/Show_Your_Work.epub',
      rating: 5,
      customFields: [{ id: 'f_syw_1', label: 'Genre', value: 'Creativity & Career' }],
      links: [],
    });

    expect(afterAdd).toBeDefined();
    const addedBook = afterAdd?.items?.find((b) => b.title === 'Show Your Work!');
    expect(addedBook).toBeDefined();
    expect(addedBook?.authorOrInstructor).toBe('Austin Kleon');
    expect(addedBook?.currentUnits).toBe(40);
    expect(addedBook?.totalUnits).toBe(224);
    expect(addedBook?.summary).toContain('10 ways to share');
    expect(addedBook?.audioLinkOrPath).toContain('audible.com');
    expect(addedBook?.localFilePath).toBe('C:/Users/YogeshMurdeshwar/Books/Show_Your_Work.epub');
    expect(addedBook?.customFields?.[0].value).toBe('Creativity & Career');

    // Update progress (+60 pages)
    const afterProgress = await LifeGoalRepository.updateItemProgress(
      userId,
      readingGoal.id,
      addedBook!.id,
      100
    );
    const updatedBook = afterProgress?.items?.find((b) => b.id === addedBook!.id);
    expect(updatedBook?.currentUnits).toBe(100);
    expect(updatedBook?.status).toBe('in_progress');

    // Mark complete
    const afterComplete = await LifeGoalRepository.updateItemProgress(
      userId,
      readingGoal.id,
      addedBook!.id,
      224,
      true
    );
    const completedBook = afterComplete?.items?.find((b) => b.id === addedBook!.id);
    expect(completedBook?.status).toBe('completed');
    expect(completedBook?.completedAt).toBeDefined();

    // Delete item
    const afterDelete = await LifeGoalRepository.deleteTrackedItem(
      userId,
      readingGoal.id,
      addedBook!.id
    );
    expect(afterDelete?.items?.find((b) => b.id === addedBook!.id)).toBeUndefined();
  });

  it('manages course items with course links, notes, and custom properties', async () => {
    const defaultGoals = getInitialLifeGoals(userId);
    const courseGoal = defaultGoals[1];

    const afterAdd = await LifeGoalRepository.addTrackedItem(userId, courseGoal.id, {
      title: 'Full Stack LLM Application Bootcamp',
      itemType: 'course',
      authorOrInstructor: 'DeepLearning.AI',
      status: 'in_progress',
      currentUnits: 2,
      totalUnits: 6,
      unitLabel: 'modules',
      summary: 'Building end-to-end AI applications with FastAPI, vector databases, and React.',
      notes: 'Remember to set temperature to 0 for structured extraction tasks.',
      primaryLink: 'https://deeplearning.ai/courses/full-stack-llm',
      localFilePath: 'C:/Users/YogeshMurdeshwar/Projects/ai-bootcamp/notes.md',
      audioLinkOrPath: 'C:/Users/YogeshMurdeshwar/Projects/ai-bootcamp/recordings/lesson1.mp4',
      customFields: [
        { id: 'f_boot_1', label: 'Platform', value: 'DeepLearning.AI' },
        { id: 'f_boot_2', label: 'Repo', value: 'github.com/yogesh/ai-bootcamp' },
      ],
      links: [],
    });

    const addedCourse = afterAdd?.items?.find((c) => c.title.includes('Full Stack LLM'));
    expect(addedCourse).toBeDefined();
    expect(addedCourse?.primaryLink).toBe('https://deeplearning.ai/courses/full-stack-llm');
    expect(addedCourse?.notes).toContain('temperature');
    expect(addedCourse?.customFields?.length).toBe(2);
  });

  it('manages goal-level custom fields and flexible links', async () => {
    const defaultGoals = getInitialLifeGoals(userId);
    const goal = defaultGoals[0];

    // Add custom field
    const withField = await LifeGoalRepository.addGoalCustomField(
      userId,
      goal.id,
      'Reading Device',
      'Kindle Paperwhite 11th Gen'
    );
    const field = withField?.customFields?.find((f) => f.label === 'Reading Device');
    expect(field).toBeDefined();
    expect(field?.value).toBe('Kindle Paperwhite 11th Gen');

    // Add flexible link
    const withLink = await LifeGoalRepository.addGoalLink(userId, goal.id, {
      title: 'Local Calibre Library',
      urlOrPath: 'C:/Users/YogeshMurdeshwar/Calibre Library',
      type: 'local_file',
    });
    const link = withLink?.links?.find((l) => l.title === 'Local Calibre Library');
    expect(link).toBeDefined();
    expect(link?.type).toBe('local_file');

    // Delete field and link
    const afterDelField = await LifeGoalRepository.deleteGoalCustomField(userId, goal.id, field!.id);
    expect(afterDelField?.customFields?.find((f) => f.id === field!.id)).toBeUndefined();

    const afterDelLink = await LifeGoalRepository.deleteGoalLink(userId, goal.id, link!.id);
    expect(afterDelLink?.links?.find((l) => l.id === link!.id)).toBeUndefined();
  });

  it('manages structured phases, roadmap, and phase tasks with auto-progress', async () => {
    const goal: LifeGoal = {
      id: 'test_goal_phased_project',
      userId,
      title: 'Build Autonomous AI Agent Platform',
      domain: 'professional',
      category: 'Software Engineering',
      priority: 'critical',
      trackingMode: 'phases',
      startValue: 0,
      currentValue: 0,
      targetValue: 2,
      unit: 'phases',
      phases: [],
      lists: [],
      experiences: [],
      checklist: [],
      startDate: '2026-10-01',
      targetDate: '2026-12-31',
      progressLogs: [],
      status: 'in_progress',
      color: '#6366f1',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await LifeGoalRepository.saveGoal(goal);

    // Add Phase 1
    const withPhase1 = await LifeGoalRepository.addPhase(userId, goal.id, {
      title: 'Phase 1: Architecture & Prototyping',
      description: 'Setup vector DB and LLM router',
      status: 'in_progress',
      tasks: [],
    });
    const p1 = withPhase1?.phases?.find((p) => p.title.includes('Phase 1'));
    expect(p1).toBeDefined();
    expect(p1?.status).toBe('in_progress');

    // Add task to Phase 1
    const withTask = await LifeGoalRepository.addPhaseTask(
      userId,
      goal.id,
      p1!.id,
      'Deploy Qdrant vector database container'
    );
    const updatedP1 = withTask?.phases?.find((p) => p.id === p1!.id);
    expect(updatedP1?.tasks.length).toBe(1);
    expect(updatedP1?.tasks[0].text).toContain('Qdrant');

    // Toggle phase task
    const withToggledTask = await LifeGoalRepository.togglePhaseTask(
      userId,
      goal.id,
      p1!.id,
      updatedP1!.tasks[0].id
    );
    expect(withToggledTask?.phases?.[0].tasks[0].isCompleted).toBe(true);

    // Add Phase 2
    const withPhase2 = await LifeGoalRepository.addPhase(userId, goal.id, {
      title: 'Phase 2: Production Release',
      description: 'Cloud deployment and monitoring',
      status: 'not_started',
      tasks: [],
    });
    expect(withPhase2?.phases?.length).toBe(2);

    // Toggle Phase 1 to completed -> auto progress should calculate 1/2 phases completed
    const completedPhase1 = await LifeGoalRepository.togglePhaseStatus(userId, goal.id, p1!.id);
    expect(completedPhase1?.phases?.find((p) => p.id === p1!.id)?.status).toBe('completed');
    expect(completedPhase1?.currentValue).toBe(1);
    expect(completedPhase1?.targetValue).toBe(2);
  });

  it('manages multiple custom named lists and task completion', async () => {
    const goal: LifeGoal = {
      id: 'test_goal_lists',
      userId,
      title: 'Hike Pacific Crest Trail Section',
      domain: 'personal',
      category: 'Adventure',
      priority: 'high',
      trackingMode: 'tasks',
      startValue: 0,
      currentValue: 0,
      targetValue: 1,
      unit: 'tasks',
      phases: [],
      lists: [],
      experiences: [],
      startDate: '2026-10-01',
      targetDate: '2027-06-01',
      progressLogs: [],
      status: 'in_progress',
      color: '#10b981',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await LifeGoalRepository.saveGoal(goal);

    // Add named list "Gear & Equipment"
    const withList1 = await LifeGoalRepository.addNamedList(userId, goal.id, 'Gear & Equipment', 'checklist');
    const gearList = withList1?.lists?.find((l) => l.title === 'Gear & Equipment');
    expect(gearList).toBeDefined();

    // Add item to Gear list
    const withItem = await LifeGoalRepository.addListItem(
      userId,
      goal.id,
      gearList!.id,
      'Ultralight tent & sleeping quilt'
    );
    const item = withItem?.lists?.find((l) => l.id === gearList!.id)?.items[0];
    expect(item).toBeDefined();
    expect(item?.text).toContain('Ultralight tent');

    // Toggle item completion
    const toggled = await LifeGoalRepository.toggleListItem(userId, goal.id, gearList!.id, item!.id);
    expect(toggled?.lists?.[0].items[0].isCompleted).toBe(true);
    expect(toggled?.currentValue).toBe(1);

    // Delete item
    const deletedItem = await LifeGoalRepository.deleteListItem(userId, goal.id, gearList!.id, item!.id);
    expect(deletedItem?.lists?.[0].items.length).toBe(0);
  });

  it('logs experiences, reflections, and mood ratings in journal', async () => {
    const defaultGoals = getInitialLifeGoals(userId);
    const goal = defaultGoals[0];

    // Add reflection entry
    const withExp = await LifeGoalRepository.addExperienceEntry(userId, goal.id, {
      date: '2026-10-20',
      title: 'Deep focus morning session',
      content: 'Woke up at 6:30am and read 40 pages uninterrupted. Clear mind and great retention.',
      type: 'breakthrough',
      moodRating: 5,
      tags: ['#morningroutine', '#deepfocus'],
    });

    const exp = withExp?.experiences?.find((e) => e.title.includes('Deep focus'));
    expect(exp).toBeDefined();
    expect(exp?.moodRating).toBe(5);
    expect(exp?.tags).toContain('#morningroutine');

    // Update reflection entry
    const updatedExp = await LifeGoalRepository.updateExperienceEntry(userId, goal.id, exp!.id, {
      content: 'Updated content with additional insights on retention.',
      moodRating: 4,
    });
    const foundExp = updatedExp?.experiences?.find((e) => e.id === exp!.id);
    expect(foundExp?.content).toContain('additional insights');
    expect(foundExp?.moodRating).toBe(4);

    // Delete reflection entry
    const afterDelete = await LifeGoalRepository.deleteExperienceEntry(userId, goal.id, exp!.id);
    expect(afterDelete?.experiences?.find((e) => e.id === exp!.id)).toBeUndefined();
  });
});

