import {ToolSchema} from '../registry/tool-registry.js';

export const CREATE_TASKS_SCHEMA: ToolSchema = {
	type: 'function',
	function: {
		name: 'create_tasks',
		description:
			'Break down complex requests into organized task lists. Use for multi-step projects. Example: {"user_query": "Build login system", "tasks": [{"id": "1", "description": "Create user model", "status": "pending"}]}',
		parameters: {
			type: 'object',
			properties: {
				user_query: {
					type: 'string',
					description: 'Original user request being broken down',
				},
				tasks: {
					type: 'array',
					description: 'List of actionable subtasks',
					items: {
						type: 'object',
						properties: {
							id: {
								type: 'string',
								description:
									'Unique task identifier string (e.g., "1", "2", "3")',
							},
							description: {
								type: 'string',
								description: 'Clear, actionable task description',
							},
							status: {
								type: 'string',
								enum: ['pending', 'in_progress', 'completed'],
								description: 'Task status: pending, in_progress, or completed',
								default: 'pending',
							},
						},
						required: ['id', 'description'],
					},
				},
			},
			required: ['user_query', 'tasks'],
		},
	},
};

export const UPDATE_TASKS_SCHEMA: ToolSchema = {
	type: 'function',
	function: {
		name: 'update_tasks',
		description:
			'Update task progress and status. Use to mark tasks as started or completed. Example: {"task_updates": [{"id": "1", "status": "completed", "notes": "Successfully implemented"}]}',
		parameters: {
			type: 'object',
			properties: {
				task_updates: {
					type: 'array',
					description: 'Array of status updates for specific tasks',
					items: {
						type: 'object',
						properties: {
							id: {
								type: 'string',
								description:
									'ID string of task to update (must match existing task ID)',
							},
							status: {
								type: 'string',
								enum: ['pending', 'in_progress', 'completed'],
								description: 'New status: pending, in_progress, or completed',
							},
							notes: {
								type: 'string',
								description: 'Optional progress notes or completion details',
							},
						},
						required: ['id', 'status'],
					},
				},
			},
			required: ['task_updates'],
		},
	},
};
