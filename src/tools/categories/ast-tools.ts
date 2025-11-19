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

// Executors

async function getASTTreeExecutor(
	args: Record<string, any>,
): Promise<Record<string, any>> {
	const {file_path} = args;

	try {
		const analyzer = new ASTAnalyzer();
		const astTree = analyzer.getASTTree(file_path);

		if (!astTree) {
			return createToolResponse(
				false,
				undefined,
				'',
				`Error: Could not parse AST for ${file_path}. File may not exist or may not be valid TypeScript/JavaScript.`,
			);
		}

		const formatted = JSON.stringify(astTree, null, 2);
		return createToolResponse(
			true,
			formatted,
			`Generated AST tree for ${file_path}`,
		);
	} catch (error) {
		const err = error as Error;
		return createToolResponse(
			false,
			undefined,
			'',
			`Error: Failed to generate AST: ${err.message}`,
		);
	}
}

async function extractSymbolsExecutor(
	args: Record<string, any>,
): Promise<Record<string, any>> {
	const {file_path} = args;

	try {
		const analyzer = new ASTAnalyzer();
		const symbols = analyzer.extractSymbols(file_path);

		if (symbols.length === 0) {
			return createToolResponse(
				true,
				'[]',
				`No symbols found in ${file_path}`,
			);
		}

		const formatted = JSON.stringify(symbols, null, 2);
		return createToolResponse(
			true,
			formatted,
			`Extracted ${symbols.length} symbols from ${file_path}`,
		);
	} catch (error) {
		const err = error as Error;
		return createToolResponse(
			false,
			undefined,
			'',
			`Error: Failed to extract symbols: ${err.message}`,
		);
	}
}

async function buildDependencyGraphExecutor(
	args: Record<string, any>,
): Promise<Record<string, any>> {
	const {directory_path} = args;

	try {
		const analyzer = new ASTAnalyzer();
		const graph = analyzer.buildDependencyGraph(directory_path);

		const formatted = JSON.stringify(graph, null, 2);
		return createToolResponse(
			true,
			formatted,
			`Built dependency graph with ${graph.nodes.length} nodes and ${graph.edges.length} edges`,
		);
	} catch (error) {
		const err = error as Error;
		return createToolResponse(
			false,
			undefined,
			'',
			`Error: Failed to build dependency graph: ${err.message}`,
		);
	}
}

async function calculateComplexityExecutor(
	args: Record<string, any>,
): Promise<Record<string, any>> {
	const {file_path} = args;

	try {
		const analyzer = new ASTAnalyzer();
		const complexity = analyzer.calculateComplexity(file_path);

		if (!complexity) {
			return createToolResponse(
				false,
				undefined,
				'',
				`Error: Could not calculate complexity for ${file_path}`,
			);
		}

		const formatted = JSON.stringify(complexity, null, 2);
		const summary = [
			`Complexity analysis for ${path.basename(file_path)}:`,
			`- Cyclomatic Complexity: ${complexity.cyclomaticComplexity}`,
			`- Cognitive Complexity: ${complexity.cognitiveComplexity}`,
			`- Lines of Code: ${complexity.linesOfCode}`,
			`- Maintainability Index: ${complexity.maintainabilityIndex.toFixed(2)}`,
		].join('\n');

		return createToolResponse(true, formatted, summary);
	} catch (error) {
		const err = error as Error;
		return createToolResponse(
			false,
			undefined,
			'',
			`Error: Failed to calculate complexity: ${err.message}`,
		);
	}
}

async function findUnusedExportsExecutor(
	args: Record<string, any>,
): Promise<Record<string, any>> {
	const {file_path} = args;

	try {
		const analyzer = new ASTAnalyzer();
		const unusedExports = analyzer.findUnusedExports(file_path);

		if (unusedExports.length === 0) {
			return createToolResponse(
				true,
				'[]',
				`No unused exports found in ${file_path}`,
			);
		}

		const formatted = JSON.stringify(unusedExports, null, 2);
		return createToolResponse(
			true,
			formatted,
			`Found ${unusedExports.length} unused exports in ${file_path}`,
		);
	} catch (error) {
		const err = error as Error;
		return createToolResponse(
			false,
			undefined,
			'',
			`Error: Failed to find unused exports: ${err.message}`,
		);
	}
}

async function renameSymbolExecutor(
	args: Record<string, any>,
): Promise<Record<string, any>> {
	const {file_path, old_name, new_name} = args;

	try {
		const analyzer = new ASTAnalyzer();
		const success = analyzer.renameSymbol(file_path, old_name, new_name);

		if (!success) {
			return createToolResponse(
				false,
				undefined,
				'',
				`Error: Could not find symbol '${old_name}' in ${file_path}`,
			);
		}

		return createToolResponse(
			true,
			'',
			`Renamed '${old_name}' to '${new_name}' across project`,
		);
	} catch (error) {
		const err = error as Error;
		return createToolResponse(
			false,
			undefined,
			'',
			`Error: Failed to rename symbol: ${err.message}`,
		);
	}
}

async function extractFunctionExecutor(
	args: Record<string, any>,
): Promise<Record<string, any>> {
	const {source_file, function_name, target_file} = args;

	try {
		const analyzer = new ASTAnalyzer();
		const success = analyzer.extractFunction(
			source_file,
			function_name,
			target_file,
		);

		if (!success) {
			return createToolResponse(
				false,
				undefined,
				'',
				`Error: Could not extract function '${function_name}' from ${source_file}`,
			);
		}

		return createToolResponse(
			true,
			'',
			`Extracted '${function_name}' from ${source_file} to ${target_file}`,
		);
	} catch (error) {
		const err = error as Error;
		return createToolResponse(
			false,
			undefined,
			'',
			`Error: Failed to extract function: ${err.message}`,
		);
	}
}

async function findSymbolReferencesExecutor(
	args: Record<string, any>,
): Promise<Record<string, any>> {
	const {file_path, symbol_name} = args;

	try {
		const analyzer = new ASTAnalyzer();
		const sourceFile = analyzer.addSourceFile(file_path);

		if (!sourceFile) {
			return createToolResponse(
				false,
				undefined,
				'',
				`Error: Could not load file ${file_path}`,
			);
		}

		// Find the symbol
		const symbols = analyzer.extractSymbols(file_path);
		const symbol = symbols.find(s => s.name === symbol_name);

		if (!symbol) {
			return createToolResponse(
				false,
				undefined,
				'',
				`Error: Symbol '${symbol_name}' not found in ${file_path}`,
			);
		}

		const references = {
			symbol: symbol_name,
			kind: symbol.kind,
			totalReferences: symbol.references,
			exported: symbol.exported,
		};

		const formatted = JSON.stringify(references, null, 2);
		return createToolResponse(
			true,
			formatted,
			`Found ${symbol.references} references to '${symbol_name}'`,
		);
	} catch (error) {
		const err = error as Error;
		return createToolResponse(
			false,
			undefined,
			'',
			`Error: Failed to find references: ${err.message}`,
		);
	}
}

async function analyzeImportsExecutor(
	args: Record<string, any>,
): Promise<Record<string, any>> {
	const {file_path} = args;

	try {
		const analyzer = new ASTAnalyzer();
		const sourceFile = analyzer.addSourceFile(file_path);

		if (!sourceFile) {
			return createToolResponse(
				false,
				undefined,
				'',
				`Error: Could not load file ${file_path}`,
			);
		}

		const imports = sourceFile.getImportDeclarations().map(imp => ({
			module: imp.getModuleSpecifierValue(),
			namedImports: imp.getNamedImports().map(n => n.getName()),
			defaultImport: imp.getDefaultImport()?.getText(),
			isTypeOnly: imp.isTypeOnly(),
		}));

		const formatted = JSON.stringify(imports, null, 2);
		return createToolResponse(
			true,
			formatted,
			`Analyzed ${imports.length} import statements in ${file_path}`,
		);
	} catch (error) {
		const err = error as Error;
		return createToolResponse(
			false,
			undefined,
			'',
			`Error: Failed to analyze imports: ${err.message}`,
		);
	}
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
