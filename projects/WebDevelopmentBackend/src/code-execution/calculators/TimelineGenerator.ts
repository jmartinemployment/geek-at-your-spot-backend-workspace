// ============================================
// src/code-execution/calculators/TimelineGenerator.ts
// Timeline Generation with Dependencies & Critical Path
// ============================================

import {
  TimelineInput,
  TimelineResult,
  TimelinePhase,
  TimelineTask,
  DependencyNode,
  DependencyAnalysisResult,
} from '../types';

export class TimelineGenerator {
  private workHoursPerDay: number = 8;
  private workDaysPerWeek: number = 5;
  private bufferPercentage: number = 0.15; // 15% buffer

  constructor(config?: {
    workHoursPerDay?: number;
    workDaysPerWeek?: number;
    bufferPercentage?: number;
  }) {
    if (config?.workHoursPerDay) this.workHoursPerDay = config.workHoursPerDay;
    if (config?.workDaysPerWeek) this.workDaysPerWeek = config.workDaysPerWeek;
    if (config?.bufferPercentage) this.bufferPercentage = config.bufferPercentage;
  }

  /**
   * Generate complete project timeline with dependencies
   */
  generate(input: TimelineInput): TimelineResult {
    const {
      phases: inputPhases,
      teamSize = 2,
      workHoursPerDay = this.workHoursPerDay,
      workDaysPerWeek = this.workDaysPerWeek,
      buffer = this.bufferPercentage,
    } = input;

    // Build dependency graph
    const dependencyGraph = this.buildDependencyGraph(inputPhases);

    // Calculate critical path
    const criticalPath = this.calculateCriticalPath(dependencyGraph);

    // Generate phases with tasks
    const phases: TimelinePhase[] = [];
    let currentWeek = 1;

    for (const phaseInput of inputPhases) {
      const phase = this.generatePhase(
        phaseInput,
        currentWeek,
        teamSize,
        workHoursPerDay,
        workDaysPerWeek,
        buffer,
        dependencyGraph
      );

      phases.push(phase);
      currentWeek = phase.endWeek + 1;
    }

    // Calculate totals
    const totalWeeks = phases.at(-1)?.endWeek || 0;
    const totalDays = totalWeeks * workDaysPerWeek;

    // Generate warnings
    const warnings = this.generateWarnings(phases, criticalPath, dependencyGraph);

    return {
      totalWeeks,
      totalDays,
      phases,
      criticalPath: criticalPath.map(node => node.name),
      warnings,
    };
  }

  /**
   * Build dependency graph from phases
   */
  private buildDependencyGraph(
    phases: TimelineInput['phases']
  ): DependencyNode[] {
    const nodes: DependencyNode[] = [];

    for (const phase of phases) {
      for (const task of phase.tasks) {
        const taskId = `${phase.name}:${task.name}`;

        nodes.push({
          id: taskId,
          name: task.name,
          type: 'task',
          duration: task.estimatedHours,
          dependencies: task.dependencies || [],
          dependents: [],
        });
      }
    }

    // Calculate dependents (reverse dependencies)
    for (const node of nodes) {
      for (const depId of node.dependencies) {
        const depNode = nodes.find(n => n.id === depId || n.name === depId);
        if (depNode) {
          depNode.dependents.push(node.id);
        }
      }
    }

    return nodes;
  }

  /**
   * Calculate critical path using topological sort
   */
  private calculateCriticalPath(graph: DependencyNode[]): DependencyNode[] {
    // Calculate earliest start times
    const earliestStart: Map<string, number> = new Map();

    const calculateEarliestStart = (node: DependencyNode): number => {
      if (earliestStart.has(node.id)) {
        return earliestStart.get(node.id) ?? 0;
      }

      if (node.dependencies.length === 0) {
        earliestStart.set(node.id, 0);
        return 0;
      }

      let maxDepEnd = 0;
      for (const depId of node.dependencies) {
        const depNode = graph.find(n => n.id === depId || n.name === depId);
        if (depNode) {
          const depStart = calculateEarliestStart(depNode);
          maxDepEnd = Math.max(maxDepEnd, depStart + depNode.duration);
        }
      }

      earliestStart.set(node.id, maxDepEnd);
      return maxDepEnd;
    };

    // Calculate earliest start for all nodes
    for (const node of graph) {
      calculateEarliestStart(node);
    }

    // Find critical path (longest path)
    const criticalNodes: DependencyNode[] = [];
    const currentNode = graph.reduce((longest, node) => {
      const nodeEnd = (earliestStart.get(node.id) || 0) + node.duration;
      const longestEnd = (earliestStart.get(longest.id) || 0) + longest.duration;
      return nodeEnd > longestEnd ? node : longest;
    }, graph[0]);

    // Trace back through dependencies
    const visited = new Set<string>();
    const tracePath = (node: DependencyNode) => {
      if (visited.has(node.id)) return;
      visited.add(node.id);
      criticalNodes.push(node);

      // Find the dependency with the latest end time
      let latestDep: DependencyNode | null = null;
      let latestEnd = -1;

      for (const depId of node.dependencies) {
        const depNode = graph.find(n => n.id === depId || n.name === depId);
        if (depNode) {
          const depEnd = (earliestStart.get(depNode.id) || 0) + depNode.duration;
          if (depEnd > latestEnd) {
            latestEnd = depEnd;
            latestDep = depNode;
          }
        }
      }

      if (latestDep) {
        tracePath(latestDep);
      }
    };

    if (currentNode) {
      tracePath(currentNode);
    }

    return criticalNodes.reverse();
  }

  /**
   * Identify tasks that can be done in parallel
   */
  private identifyParallelTasks(graph: DependencyNode[]): string[][] {
    const parallelGroups: string[][] = [];
    const processed = new Set<string>();

    // Group tasks with no dependencies on each other
    for (const node of graph) {
      if (processed.has(node.id)) continue;

      const group = [node.id];
      processed.add(node.id);

      // Find tasks that can run in parallel with this one
      for (const otherNode of graph) {
        if (processed.has(otherNode.id)) continue;

        // Check if tasks are independent
        const hasCircularDep =
          node.dependencies.includes(otherNode.id) ||
          otherNode.dependencies.includes(node.id) ||
          node.dependents.includes(otherNode.id) ||
          otherNode.dependents.includes(node.id);

        if (!hasCircularDep) {
          group.push(otherNode.id);
          processed.add(otherNode.id);
        }
      }

      if (group.length > 1) {
        parallelGroups.push(group);
      }
    }

    return parallelGroups;
  }

  /**
   * Generate a single phase
   */
  private generatePhase(
    phaseInput: TimelineInput['phases'][0],
    startWeek: number,
    teamSize: number,
    workHoursPerDay: number,
    workDaysPerWeek: number,
    buffer: number,
    _dependencyGraph: DependencyNode[]
  ): TimelinePhase {
    const tasks: TimelineTask[] = [];
    let currentDay = 0;

    // Convert hours to days
    const hoursPerDay = workHoursPerDay * teamSize;

    for (const taskInput of phaseInput.tasks) {
      const taskDays = Math.ceil((taskInput.estimatedHours / hoursPerDay) * (1 + buffer));

      // Check dependencies to determine start day
      let earliestStart = currentDay;
      if (taskInput.dependencies && taskInput.dependencies.length > 0) {
        for (const depName of taskInput.dependencies) {
          const depTask = tasks.find(t => t.name === depName);
          if (depTask) {
            earliestStart = Math.max(earliestStart, depTask.endDay);
          }
        }
      }

      const task: TimelineTask = {
        id: `${phaseInput.name}:${taskInput.name}`,
        name: taskInput.name,
        durationDays: taskDays,
        startDay: earliestStart,
        endDay: earliestStart + taskDays,
        dependencies: taskInput.dependencies || [],
        status: 'pending',
      };

      tasks.push(task);
      currentDay = Math.max(currentDay, task.endDay);
    }

    // Calculate phase duration in weeks
    const phaseDays = Math.max(...tasks.map(t => t.endDay), 1);
    const phaseWeeks = Math.ceil(phaseDays / workDaysPerWeek);

    // Generate milestones
    const milestones = this.generateMilestones(phaseInput.name, tasks);

    return {
      phase: phaseInput.name,
      description: `${phaseInput.tasks.length} tasks`,
      durationWeeks: phaseWeeks,
      startWeek,
      endWeek: startWeek + phaseWeeks - 1,
      tasks,
      dependencies: [],
      milestones,
    };
  }

  /**
   * Generate milestones for a phase
   */
  private generateMilestones(phaseName: string, tasks: TimelineTask[]): string[] {
    const milestones: string[] = [];

    // Start milestone
    milestones.push(`${phaseName} started`);

    // Middle milestone (50% complete)
    const midPoint = Math.floor(tasks.length / 2);
    if (midPoint > 0) {
      milestones.push(`${tasks[midPoint].name} completed (50% progress)`);
    }

    // End milestone
    milestones.push(`${phaseName} completed`);

    return milestones;
  }

  /**
   * Generate warnings based on timeline analysis
   */
  private generateWarnings(
    phases: TimelinePhase[],
    criticalPath: DependencyNode[],
    dependencyGraph: DependencyNode[]
  ): string[] {
    const warnings: string[] = [];

    // Check for long phases
    for (const phase of phases) {
      if (phase.durationWeeks > 12) {
        warnings.push(`Phase "${phase.phase}" exceeds 3 months - consider breaking into sub-phases`);
      }
    }

    // Check for bottlenecks (tasks with many dependents)
    const bottlenecks = dependencyGraph.filter(node => node.dependents.length > 3);
    if (bottlenecks.length > 0) {
      warnings.push(
        `${bottlenecks.length} potential bottleneck(s) detected: ${bottlenecks
          .map(n => n.name)
          .slice(0, 3)
          .join(', ')}`
      );
    }

    // Check for long dependency chains
    if (criticalPath.length > 10) {
      warnings.push(
        `Critical path is long (${criticalPath.length} tasks) - delays will cascade through project`
      );
    }

    // Check for tasks with no dependencies (possible missing dependencies)
    const independentTasks = dependencyGraph.filter(
      node => node.dependencies.length === 0 && node.dependents.length === 0
    );
    if (independentTasks.length > 5) {
      warnings.push(
        `${independentTasks.length} independent tasks - verify dependencies are correctly specified`
      );
    }

    return warnings;
  }

  /**
   * Analyze dependencies and return detailed analysis
   */
  analyzeDependencies(input: TimelineInput): DependencyAnalysisResult {
    const dependencyGraph = this.buildDependencyGraph(input.phases);
    const criticalPath = this.calculateCriticalPath(dependencyGraph);
    const parallelizable = this.identifyParallelTasks(dependencyGraph);

    // Find bottlenecks (tasks with many dependents)
    const bottlenecks = dependencyGraph
      .filter(node => node.dependents.length > 2)
      .sort((a, b) => b.dependents.length - a.dependents.length)
      .map(node => node.id);

    // Calculate total duration on critical path
    const totalDuration = criticalPath.reduce((sum, node) => sum + node.duration, 0);

    return {
      graph: dependencyGraph,
      criticalPath: criticalPath.map(node => node.id),
      bottlenecks,
      parallelizable,
      totalDuration,
    };
  }

  /**
   * Optimize timeline by parallelizing tasks
   */
  optimize(input: TimelineInput): TimelineResult {
    const analysis = this.analyzeDependencies(input);

    // Generate optimized timeline
    const timeline = this.generate(input);

    // Add optimization suggestions to warnings
    if (analysis.parallelizable.length > 0) {
      timeline.warnings = timeline.warnings || [];
      timeline.warnings.push(
        `${analysis.parallelizable.length} groups of tasks can be parallelized to reduce timeline`
      );
    }

    return timeline;
  }

  /**
   * Calculate earliest possible completion date
   */
  calculateEarliestCompletion(
    input: TimelineInput,
    startDate: Date
  ): Date {
    const timeline = this.generate(input);
    const workDaysPerWeek = input.workDaysPerWeek || this.workDaysPerWeek;

    // Calculate total working days
    const totalWorkingDays = timeline.totalWeeks * workDaysPerWeek;

    // Add working days to start date (skipping weekends)
    const currentDate = new Date(startDate);
    let daysAdded = 0;

    while (daysAdded < totalWorkingDays) {
      currentDate.setDate(currentDate.getDate() + 1);

      // Skip weekends (0 = Sunday, 6 = Saturday)
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        daysAdded++;
      }
    }

    return currentDate;
  }

  /**
   * Get configuration
   */
  getConfig() {
    return {
      workHoursPerDay: this.workHoursPerDay,
      workDaysPerWeek: this.workDaysPerWeek,
      bufferPercentage: this.bufferPercentage,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: {
    workHoursPerDay?: number;
    workDaysPerWeek?: number;
    bufferPercentage?: number;
  }) {
    if (config.workHoursPerDay) this.workHoursPerDay = config.workHoursPerDay;
    if (config.workDaysPerWeek) this.workDaysPerWeek = config.workDaysPerWeek;
    if (config.bufferPercentage) this.bufferPercentage = config.bufferPercentage;
  }
}
