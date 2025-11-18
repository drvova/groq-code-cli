/**
 * Task Tools Category - Task management
 * Constitutional compliance: AMENDMENT IV - Clean task tools
 */

import {ToolSchema, ToolRegistry} from '../registry/tool-registry.js';
import {createToolResponse} from '../tools.js';
import {
    CREATE_TASKS_SCHEMA,
    UPDATE_TASKS_SCHEMA
} from '../schemas/task-schemas.js';

interface Task {
	id: string;
	description: string;
	status: 'pending' | 'in_progress' | 'completed';
	notes?: string;
	updated_at?: string;
}

// Global task state (in-memory for now, should be moved to context/storage)
let currentTaskList: {
	user_query: string;
	tasks: Task[];
	created_at: string;
} | null = null;

// Executors
async function createTasksExecutor(
	args: Record<string, any>,
): Promise<Record<string, any>> {
	const {user_query, tasks} = args;

	currentTaskList = {
		user_query,
		tasks: tasks.map((t: any) => ({
			...t,
			status: t.status || 'pending',
			updated_at: new Date().toISOString(),
		})),
		created_at: new Date().toISOString(),
	};

	return createToolResponse(
		true,
		currentTaskList,
		`Created task list with ${tasks.length} tasks`,
	);
}

async function updateTasksExecutor(
	args: Record<string, any>,
): Promise<Record<string, any>> {
	const {task_updates} = args;

	if (!currentTaskList) {
		return createToolResponse(
			false,
			undefined,
			'',
			'Error: No active task list. Create tasks first.',
		);
	}

	let updatedCount = 0;
	for (const update of task_updates) {
		const task = currentTaskList.tasks.find(t => t.id === update.id);
		if (task) {
			if (update.status) task.status = update.status;
			if (update.notes) task.notes = update.notes;
			task.updated_at = new Date().toISOString();
			updatedCount++;
		}
	}

	return createToolResponse(
		true,
		currentTaskList,
		`Updated ${updatedCount} tasks`,
	);
}

// Register all task tools
export function registerTaskTools(): void {
	ToolRegistry.registerTool(CREATE_TASKS_SCHEMA, createTasksExecutor, 'safe');
	ToolRegistry.registerTool(UPDATE_TASKS_SCHEMA, updateTasksExecutor, 'safe');
}
