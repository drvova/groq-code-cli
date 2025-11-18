/**
 * Task Tools Category - Task management operations
 * Constitutional compliance: AMENDMENT IV - Simple task tracking
 */

import fs from 'fs';
import path from 'path';
import {ToolSchema, ToolRegistry} from '../registry/tool-registry.js';
import {createToolResponse} from '../tools.js';

// Schemas
const CREATE_TASKS_SCHEMA: ToolSchema = {
	type: 'function',
	function: {
		name: 'create_tasks',
		description:
			'Create a task list for tracking work. Use when planning multi-step implementations. Tasks can be marked as pending, in_progress, or completed. Example: {"tasks": [{"description": "Setup database", "status": "pending"}], "project_name": "auth-system"}',
		parameters: {
			type: 'object',
			properties: {
				tasks: {
					type: 'array',
					description: 'List of tasks to create',
					items: {
						type: 'object',
						properties: {
							description: {
								type: 'string',
								description: 'Task description',
							},
							status: {
								type: 'string',
								enum: ['pending', 'in_progress', 'completed'],
								description: 'Task status',
								default: 'pending',
							},
						},
						required: ['description'],
					},
				},
				project_name: {
					type: 'string',
					description: 'Project/feature name for the task list',
				},
			},
			required: ['tasks'],
		},
	},
};

const UPDATE_TASKS_SCHEMA: ToolSchema = {
	type: 'function',
	function: {
		name: 'update_tasks',
		description:
			'Update existing tasks. Change status, add new tasks, or mark tasks complete. Example: {"updates": [{"task_id": 0, "status": "completed"}], "new_tasks": [{"description": "Write tests", "status": "pending"}]}',
		parameters: {
			type: 'object',
			properties: {
				updates: {
					type: 'array',
					description: 'Updates to existing tasks',
					items: {
						type: 'object',
						properties: {
							task_id: {
								type: 'integer',
								description: 'Task index (0-based)',
							},
							status: {
								type: 'string',
								enum: ['pending', 'in_progress', 'completed'],
								description: 'New status',
							},
						},
						required: ['task_id', 'status'],
					},
				},
				new_tasks: {
					type: 'array',
					description: 'New tasks to add',
					items: {
						type: 'object',
						properties: {
							description: {
								type: 'string',
								description: 'Task description',
							},
							status: {
								type: 'string',
								enum: ['pending', 'in_progress', 'completed'],
								description: 'Task status',
								default: 'pending',
							},
						},
						required: ['description'],
					},
				},
			},
			required: [],
		},
	},
};

// Task storage
const TASKS_FILE = path.join(process.cwd(), '.groq', 'tasks.json');

interface Task {
	description: string;
	status: 'pending' | 'in_progress' | 'completed';
}

interface TaskList {
	project_name?: string;
	tasks: Task[];
	created_at: string;
	updated_at: string;
}

// Helper functions
async function loadTasks(): Promise<TaskList | null> {
	try {
		const content = await fs.promises.readFile(TASKS_FILE, 'utf-8');
		return JSON.parse(content);
	} catch {
		return null;
	}
}

async function saveTasks(taskList: TaskList): Promise<void> {
	const dir = path.dirname(TASKS_FILE);
	await fs.promises.mkdir(dir, {recursive: true});
	await fs.promises.writeFile(TASKS_FILE, JSON.stringify(taskList, null, 2));
}

// Executors
async function createTasksExecutor(args: Record<string, any>): Promise<Record<string, any>> {
	const {tasks, project_name} = args;

	try {
		const taskList: TaskList = {
			project_name,
			tasks: tasks.map((t: any) => ({
				description: t.description,
				status: t.status || 'pending',
			})),
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};

		await saveTasks(taskList);

		const summary = tasks.map((t: Task, i: number) =>
			`${i + 1}. [${t.status}] ${t.description}`
		).join('\n');

		return createToolResponse(
			true,
			summary,
			`Created ${tasks.length} tasks${project_name ? ` for ${project_name}` : ''}`,
		);
	} catch (error) {
		const err = error as Error;
		return createToolResponse(
			false,
			undefined,
			'',
			`Error: Failed to create tasks: ${err.message}`,
		);
	}
}

async function updateTasksExecutor(args: Record<string, any>): Promise<Record<string, any>> {
	const {updates = [], new_tasks = []} = args;

	try {
		const taskList = await loadTasks();

		if (!taskList) {
			return createToolResponse(
				false,
				undefined,
				'',
				'Error: No task list exists. Use create_tasks first.',
			);
		}

		// Apply updates
		for (const update of updates) {
			const {task_id, status} = update;
			if (task_id >= 0 && task_id < taskList.tasks.length) {
				taskList.tasks[task_id].status = status;
			}
		}

		// Add new tasks
		for (const task of new_tasks) {
			taskList.tasks.push({
				description: task.description,
				status: task.status || 'pending',
			});
		}

		taskList.updated_at = new Date().toISOString();
		await saveTasks(taskList);

		const summary = taskList.tasks.map((t, i) =>
			`${i + 1}. [${t.status}] ${t.description}`
		).join('\n');

		return createToolResponse(
			true,
			summary,
			`Updated tasks (${updates.length} updated, ${new_tasks.length} added)`,
		);
	} catch (error) {
		const err = error as Error;
		return createToolResponse(
			false,
			undefined,
			'',
			`Error: Failed to update tasks: ${err.message}`,
		);
	}
}

// Register task tools
export function registerTaskTools(): void {
	ToolRegistry.registerTool(CREATE_TASKS_SCHEMA, createTasksExecutor, 'safe');
	ToolRegistry.registerTool(UPDATE_TASKS_SCHEMA, updateTasksExecutor, 'safe');
}
