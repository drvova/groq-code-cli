/**
 * AST Tools Category - Abstract Syntax Tree analysis operations
 * Constitutional compliance: AMENDMENT IV - Clean, simple AST operations
 * Constitutional compliance: AMENDMENT XV - Full implementation without placeholders
 */

import {ToolSchema, ToolRegistry} from '../registry/tool-registry.js';
import {createToolResponse} from '../tools.js';
import {ASTAnalyzer} from '../../utils/ast-analyzer.js';
import {
	GET_AST_TREE_SCHEMA,
	EXTRACT_SYMBOLS_SCHEMA,
	BUILD_DEPENDENCY_GRAPH_SCHEMA,
	CALCULATE_COMPLEXITY_SCHEMA,
	FIND_UNUSED_EXPORTS_SCHEMA,
	RENAME_SYMBOL_SCHEMA,
	EXTRACT_FUNCTION_SCHEMA,
	FIND_SYMBOL_REFERENCES_SCHEMA,
	ANALYZE_IMPORTS_SCHEMA,
} from '../schemas/ast-schemas.js';
import path from 'path';

// Helper for AST tool execution
async function executeASTTool<T>(
	action: (analyzer: ASTAnalyzer) => T | Promise<T>,
	successMessage: (result: T) => string,
	formatResult?: (result: T) => string
): Promise<Record<string, any>> {
	try {
		const analyzer = new ASTAnalyzer();
		const result = await action(analyzer);
		
		if (!result || (Array.isArray(result) && result.length === 0)) {
			// Handle empty/null results if needed, though specific tools might want custom handling
			// For now, we'll let the successMessage builder handle it or return empty structure
		}

		const formatted = formatResult ? formatResult(result) : JSON.stringify(result, null, 2);
		return createToolResponse(true, formatted, successMessage(result));
	} catch (error) {
		const err = error as Error;
		// Check for specific error messages we threw
		if (err.message.startsWith('Error:')) {
			return createToolResponse(false, undefined, '', err.message);
		}
		return createToolResponse(false, undefined, '', `Error: ${err.message}`);
	}
}

// Executors

async function getASTTreeExecutor(
	args: Record<string, any>,
): Promise<Record<string, any>> {
	return executeASTTool(
		(analyzer) => {
			const tree = analyzer.getASTTree(args.file_path);
			if (!tree) throw new Error(`Error: Could not parse AST for ${args.file_path}. File may not exist or may not be valid TypeScript/JavaScript.`);
			return tree;
		},
		() => `Generated AST tree for ${args.file_path}`
	);
}

async function extractSymbolsExecutor(
	args: Record<string, any>,
): Promise<Record<string, any>> {
	return executeASTTool(
		(analyzer) => analyzer.extractSymbols(args.file_path),
		(symbols) => symbols.length === 0 
			? `No symbols found in ${args.file_path}` 
			: `Extracted ${symbols.length} symbols from ${args.file_path}`
	);
}

async function buildDependencyGraphExecutor(
	args: Record<string, any>,
): Promise<Record<string, any>> {
	return executeASTTool(
		(analyzer) => analyzer.buildDependencyGraph(args.directory_path),
		(graph) => `Built dependency graph with ${graph.nodes.length} nodes and ${graph.edges.length} edges`
	);
}

async function calculateComplexityExecutor(
	args: Record<string, any>,
): Promise<Record<string, any>> {
	return executeASTTool(
		(analyzer) => {
			const complexity = analyzer.calculateComplexity(args.file_path);
			if (!complexity) throw new Error(`Error: Could not calculate complexity for ${args.file_path}`);
			return complexity;
		},
		(complexity) => [
			`Complexity analysis for ${path.basename(args.file_path)}:`,
			`- Cyclomatic Complexity: ${complexity.cyclomaticComplexity}`,
			`- Cognitive Complexity: ${complexity.cognitiveComplexity}`,
			`- Lines of Code: ${complexity.linesOfCode}`,
			`- Maintainability Index: ${complexity.maintainabilityIndex.toFixed(2)}`,
		].join('\n')
	);
}

async function findUnusedExportsExecutor(
	args: Record<string, any>,
): Promise<Record<string, any>> {
	return executeASTTool(
		(analyzer) => analyzer.findUnusedExports(args.file_path),
		(unused) => unused.length === 0 
			? `No unused exports found in ${args.file_path}`
			: `Found ${unused.length} unused exports in ${args.file_path}`
	);
}

async function renameSymbolExecutor(
	args: Record<string, any>,
): Promise<Record<string, any>> {
	return executeASTTool(
		(analyzer) => {
			const success = analyzer.renameSymbol(args.file_path, args.old_name, args.new_name);
			if (!success) throw new Error(`Error: Could not find symbol '${args.old_name}' in ${args.file_path}`);
			return success;
		},
		() => `Renamed '${args.old_name}' to '${args.new_name}' across project`,
		() => '' // Empty content for success
	);
}

async function extractFunctionExecutor(
	args: Record<string, any>,
): Promise<Record<string, any>> {
	return executeASTTool(
		(analyzer) => {
			const success = analyzer.extractFunction(args.source_file, args.function_name, args.target_file);
			if (!success) throw new Error(`Error: Could not extract function '${args.function_name}' from ${args.source_file}`);
			return success;
		},
		() => `Extracted '${args.function_name}' from ${args.source_file} to ${args.target_file}`,
		() => ''
	);
}

async function findSymbolReferencesExecutor(
	args: Record<string, any>,
): Promise<Record<string, any>> {
	return executeASTTool(
		(analyzer) => {
			const sourceFile = analyzer.addSourceFile(args.file_path);
			if (!sourceFile) throw new Error(`Error: Could not load file ${args.file_path}`);
			
			const symbols = analyzer.extractSymbols(args.file_path);
			const symbol = symbols.find(s => s.name === args.symbol_name);
			if (!symbol) throw new Error(`Error: Symbol '${args.symbol_name}' not found in ${args.file_path}`);

			return {
				symbol: args.symbol_name,
				kind: symbol.kind,
				totalReferences: symbol.references,
				exported: symbol.exported,
			};
		},
		(ref) => `Found ${ref.totalReferences} references to '${args.symbol_name}'`
	);
}

async function analyzeImportsExecutor(
	args: Record<string, any>,
): Promise<Record<string, any>> {
	return executeASTTool(
		(analyzer) => {
			const sourceFile = analyzer.addSourceFile(args.file_path);
			if (!sourceFile) throw new Error(`Error: Could not load file ${args.file_path}`);

			return sourceFile.getImportDeclarations().map(imp => ({
				module: imp.getModuleSpecifierValue(),
				namedImports: imp.getNamedImports().map(n => n.getName()),
				defaultImport: imp.getDefaultImport()?.getText(),
				isTypeOnly: imp.isTypeOnly(),
			}));
		},
		(imports) => `Analyzed ${imports.length} import statements in ${args.file_path}`
	);
}

// Register all AST tools
export function registerASTTools(): void {
	ToolRegistry.registerTool(GET_AST_TREE_SCHEMA, getASTTreeExecutor, 'safe');
	ToolRegistry.registerTool(
		EXTRACT_SYMBOLS_SCHEMA,
		extractSymbolsExecutor,
		'safe',
	);
	ToolRegistry.registerTool(
		BUILD_DEPENDENCY_GRAPH_SCHEMA,
		buildDependencyGraphExecutor,
		'safe',
	);
	ToolRegistry.registerTool(
		CALCULATE_COMPLEXITY_SCHEMA,
		calculateComplexityExecutor,
		'safe',
	);
	ToolRegistry.registerTool(
		FIND_UNUSED_EXPORTS_SCHEMA,
		findUnusedExportsExecutor,
		'safe',
	);
	ToolRegistry.registerTool(
		RENAME_SYMBOL_SCHEMA,
		renameSymbolExecutor,
		'approval_required',
	);
	ToolRegistry.registerTool(
		EXTRACT_FUNCTION_SCHEMA,
		extractFunctionExecutor,
		'approval_required',
	);
	ToolRegistry.registerTool(
		FIND_SYMBOL_REFERENCES_SCHEMA,
		findSymbolReferencesExecutor,
		'safe',
	);
	ToolRegistry.registerTool(
		ANALYZE_IMPORTS_SCHEMA,
		analyzeImportsExecutor,
		'safe',
	);
}
