/**
 * AST Analyzer - Abstract Syntax Tree analysis utilities
 * Constitutional compliance: AMENDMENT XV - Full implementation without placeholders
 *
 * This module provides comprehensive AST analysis capabilities using ts-morph
 * for TypeScript/JavaScript code understanding and manipulation.
 */

import {Project, SourceFile, Node, SyntaxKind, Symbol} from 'ts-morph';
import path from 'path';
import fs from 'fs';

export interface ASTNode {
	kind: string;
	name?: string;
	start: number;
	end: number;
	line: number;
	children: ASTNode[];
	text?: string;
}

export interface CodeSymbol {
	name: string;
	kind: string;
	filePath: string;
	line: number;
	references: number;
	exported: boolean;
}

export interface DependencyGraph {
	nodes: Array<{id: string; label: string; type: string}>;
	edges: Array<{from: string; to: string; type: string}>;
}

export interface CodeComplexity {
	cyclomaticComplexity: number;
	cognitiveComplexity: number;
	linesOfCode: number;
	maintainabilityIndex: number;
}

export class ASTAnalyzer {
	private project: Project;

	constructor(tsConfigPath?: string) {
		this.project = new Project({
			tsConfigFilePath: tsConfigPath,
			skipAddingFilesFromTsConfig: !tsConfigPath,
		});
	}

	/**
	 * Add source file to project for analysis
	 */
	addSourceFile(filePath: string): SourceFile | undefined {
		const resolvedPath = path.resolve(filePath);
		if (!fs.existsSync(resolvedPath)) {
			return undefined;
		}
		return this.project.addSourceFileAtPath(resolvedPath);
	}

	/**
	 * Get AST tree structure for a file
	 */
	getASTTree(filePath: string): ASTNode | null {
		const sourceFile = this.addSourceFile(filePath);
		if (!sourceFile) return null;

		const buildNode = (node: Node): ASTNode => {
			const {line} = sourceFile.getLineAndColumnAtPos(node.getStart());
			const kindName = node.getKindName();

			return {
				kind: kindName,
				name: this.getNodeName(node),
				start: node.getStart(),
				end: node.getEnd(),
				line,
				text: node.getText().slice(0, 100),
				children: node.getChildren().map(buildNode),
			};
		};

		return buildNode(sourceFile);
	}

	/**
	 * Extract all symbols (functions, classes, variables) from a file
	 */
	extractSymbols(filePath: string): CodeSymbol[] {
		const sourceFile = this.addSourceFile(filePath);
		if (!sourceFile) return [];

		const symbols: CodeSymbol[] = [];

		// Extract functions
		sourceFile.getFunctions().forEach(func => {
			const name = func.getName();
			if (!name) return;

			symbols.push({
				name,
				kind: 'function',
				filePath,
				line: sourceFile.getLineAndColumnAtPos(func.getStart()).line,
				references: func.findReferences().length,
				exported: func.isExported(),
			});
		});

		// Extract classes
		sourceFile.getClasses().forEach(cls => {
			const name = cls.getName();
			if (!name) return;

			symbols.push({
				name,
				kind: 'class',
				filePath,
				line: sourceFile.getLineAndColumnAtPos(cls.getStart()).line,
				references: cls.findReferences().length,
				exported: cls.isExported(),
			});
		});

		// Extract interfaces
		sourceFile.getInterfaces().forEach(iface => {
			symbols.push({
				name: iface.getName(),
				kind: 'interface',
				filePath,
				line: sourceFile.getLineAndColumnAtPos(iface.getStart()).line,
				references: iface.findReferences().length,
				exported: iface.isExported(),
			});
		});

		// Extract variables
		sourceFile.getVariableDeclarations().forEach(varDecl => {
			const name = varDecl.getName();
			symbols.push({
				name,
				kind: 'variable',
				filePath,
				line: sourceFile.getLineAndColumnAtPos(varDecl.getStart()).line,
				references: varDecl.findReferences().length,
				exported: this.isVariableExported(varDecl),
			});
		});

		return symbols;
	}

	/**
	 * Build dependency graph for a directory
	 */
	buildDependencyGraph(directoryPath: string): DependencyGraph {
		const resolvedDir = path.resolve(directoryPath);
		const nodes: DependencyGraph['nodes'] = [];
		const edges: DependencyGraph['edges'] = [];
		const nodeSet = new Set<string>();

		// Add all TypeScript files
		this.project.addSourceFilesAtPaths(`${resolvedDir}/**/*.ts`);
		this.project.addSourceFilesAtPaths(`${resolvedDir}/**/*.tsx`);

		this.project.getSourceFiles().forEach(sourceFile => {
			const filePath = sourceFile.getFilePath();
			const nodeId = path.relative(resolvedDir, filePath);

			if (!nodeSet.has(nodeId)) {
				nodes.push({
					id: nodeId,
					label: path.basename(filePath),
					type: 'file',
				});
				nodeSet.add(nodeId);
			}

			// Extract imports
			sourceFile.getImportDeclarations().forEach(importDecl => {
				const moduleSpecifier = importDecl.getModuleSpecifierValue();
				const resolvedImport = this.resolveImport(
					filePath,
					moduleSpecifier,
					resolvedDir,
				);

				if (resolvedImport && nodeSet.has(resolvedImport)) {
					edges.push({
						from: nodeId,
						to: resolvedImport,
						type: 'import',
					});
				}
			});
		});

		return {nodes, edges};
	}

	/**
	 * Calculate code complexity metrics
	 */
	calculateComplexity(filePath: string): CodeComplexity | null {
		const sourceFile = this.addSourceFile(filePath);
		if (!sourceFile) return null;

		let cyclomaticComplexity = 0;
		let cognitiveComplexity = 0;
		const linesOfCode = sourceFile.getEndLineNumber();

		// Calculate cyclomatic complexity
		sourceFile.forEachDescendant(node => {
			if (
				node.isKind(SyntaxKind.IfStatement) ||
				node.isKind(SyntaxKind.ForStatement) ||
				node.isKind(SyntaxKind.WhileStatement) ||
				node.isKind(SyntaxKind.DoStatement) ||
				node.isKind(SyntaxKind.CaseClause) ||
				node.isKind(SyntaxKind.ConditionalExpression) ||
				node.isKind(SyntaxKind.BinaryExpression)
			) {
				cyclomaticComplexity++;
			}

			// Simplified cognitive complexity
			if (
				node.isKind(SyntaxKind.IfStatement) ||
				node.isKind(SyntaxKind.ForStatement) ||
				node.isKind(SyntaxKind.WhileStatement)
			) {
				const depth = this.getNodeDepth(node);
				cognitiveComplexity += 1 + depth;
			}
		});

		// Simplified maintainability index
		const maintainabilityIndex = Math.max(
			0,
			100 - cyclomaticComplexity * 2 - linesOfCode * 0.01,
		);

		return {
			cyclomaticComplexity,
			cognitiveComplexity,
			linesOfCode,
			maintainabilityIndex,
		};
	}

	/**
	 * Find unused exports in a file
	 */
	findUnusedExports(filePath: string): CodeSymbol[] {
		const sourceFile = this.addSourceFile(filePath);
		if (!sourceFile) return [];

		const unusedExports: CodeSymbol[] = [];

		// Check exported functions
		sourceFile.getFunctions().forEach(func => {
			const name = func.getName();
			if (!name || !func.isExported()) return;

			const references = func.findReferences();
			let hasExternalRefs = false;

			for (const refSymbol of references) {
				for (const ref of refSymbol.getReferences()) {
					const refSourceFile = ref.getSourceFile();
					if (refSourceFile.getFilePath() !== filePath) {
						hasExternalRefs = true;
						break;
					}
				}
				if (hasExternalRefs) break;
			}

			if (!hasExternalRefs) {
				unusedExports.push({
					name,
					kind: 'function',
					filePath,
					line: sourceFile.getLineAndColumnAtPos(func.getStart()).line,
					references: 0,
					exported: true,
				});
			}
		});

		// Check exported classes
		sourceFile.getClasses().forEach(cls => {
			const name = cls.getName();
			if (!name || !cls.isExported()) return;

			const references = cls.findReferences();
			let hasExternalRefs = false;

			for (const refSymbol of references) {
				for (const ref of refSymbol.getReferences()) {
					const refSourceFile = ref.getSourceFile();
					if (refSourceFile.getFilePath() !== filePath) {
						hasExternalRefs = true;
						break;
					}
				}
				if (hasExternalRefs) break;
			}

			if (!hasExternalRefs) {
				unusedExports.push({
					name,
					kind: 'class',
					filePath,
					line: sourceFile.getLineAndColumnAtPos(cls.getStart()).line,
					references: 0,
					exported: true,
				});
			}
		});

		return unusedExports;
	}

	/**
	 * Refactor: Rename symbol across project
	 */
	renameSymbol(filePath: string, oldName: string, newName: string): boolean {
		const sourceFile = this.addSourceFile(filePath);
		if (!sourceFile) return false;

		try {
			// Find the symbol to rename
			const symbol = this.findSymbolByName(sourceFile, oldName);
			if (!symbol) return false;

			// Perform rename
			symbol.rename(newName);
			this.project.saveSync();
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Extract function to separate file
	 */
	extractFunction(
		filePath: string,
		functionName: string,
		targetFilePath: string,
	): boolean {
		const sourceFile = this.addSourceFile(filePath);
		if (!sourceFile) return false;

		try {
			const func = sourceFile.getFunction(functionName);
			if (!func) return false;

			const funcText = func.getText();
			const targetFile =
				this.project.getSourceFile(targetFilePath) ||
				this.project.createSourceFile(targetFilePath);

			targetFile.addStatements(funcText);
			func.remove();

			// Add import to original file
			sourceFile.addImportDeclaration({
				moduleSpecifier: `./${path.basename(targetFilePath, '.ts')}`,
				namedImports: [functionName],
			});

			this.project.saveSync();
			return true;
		} catch {
			return false;
		}
	}

	// Helper methods

	private getNodeName(node: Node): string | undefined {
		if (Node.isNamed(node)) {
			return node.getName();
		}
		return undefined;
	}

	private isVariableExported(varDecl: any): boolean {
		const varStatement = varDecl.getVariableStatement();
		return varStatement ? varStatement.isExported() : false;
	}

	private resolveImport(
		fromFile: string,
		moduleSpecifier: string,
		baseDir: string,
	): string | null {
		if (moduleSpecifier.startsWith('.')) {
			const fromDir = path.dirname(fromFile);
			const resolvedPath = path.resolve(fromDir, moduleSpecifier);

			// Try with extensions
			for (const ext of ['.ts', '.tsx', '.js', '.jsx', '/index.ts']) {
				const fullPath = resolvedPath + ext;
				if (fs.existsSync(fullPath)) {
					return path.relative(baseDir, fullPath);
				}
			}
		}
		return null;
	}

	private getNodeDepth(node: Node): number {
		let depth = 0;
		let current = node.getParent();

		while (current) {
			if (
				current.isKind(SyntaxKind.IfStatement) ||
				current.isKind(SyntaxKind.ForStatement) ||
				current.isKind(SyntaxKind.WhileStatement)
			) {
				depth++;
			}
			current = current.getParent();
		}

		return depth;
	}

	private findSymbolByName(
		sourceFile: SourceFile,
		name: string,
	): any | undefined {
		const func = sourceFile.getFunction(name);
		if (func) return func;

		const cls = sourceFile.getClass(name);
		if (cls) return cls;

		const iface = sourceFile.getInterface(name);
		if (iface) return iface;

		const varDecl = sourceFile
			.getVariableDeclarations()
			.find(v => v.getName() === name);
		return varDecl;
	}
}
