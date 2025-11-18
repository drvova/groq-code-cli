export interface MarkdownElement {
	type: 'text' | 'code-block' | 'heading' | 'mixed-line';
	content: string;
	level?: number;
	language?: string;
}

function detectLanguage(code: string): string {
	const trimmed = code.trim();

	// TypeScript/JavaScript patterns
	if (
		/(import|export|const|let|var|function|class|interface|type)\s/.test(
			trimmed,
		) ||
		/=>/.test(trimmed) ||
		/console\.(log|error|warn)/.test(trimmed)
	) {
		if (
			/:\s*(string|number|boolean|any|void|unknown)/.test(trimmed) ||
			/(interface|type)\s+\w+/.test(trimmed)
		) {
			return 'typescript';
		}
		return 'javascript';
	}

	// Python patterns
	if (
		/^(def|class|import|from|if __name__|print)\s/.test(trimmed) ||
		/:\s*$/.test(trimmed.split('\n')[0])
	) {
		return 'python';
	}

	// Go patterns
	if (
		/^(package|func|type|var|const|import)\s/.test(trimmed) ||
		/:=/.test(trimmed)
	) {
		return 'go';
	}

	// Rust patterns
	if (
		/^(fn|let|mut|use|struct|enum|impl|pub)\s/.test(trimmed) ||
		/->/.test(trimmed)
	) {
		return 'rust';
	}

	// Java/C++ patterns
	if (/(public|private|protected|class|void|int|String)\s/.test(trimmed)) {
		if (/System\.out\.print|new\s+\w+\(/.test(trimmed)) {
			return 'java';
		}
		return 'cpp';
	}

	// Shell/Bash patterns
	if (
		/^(#!\/bin\/(bash|sh)|cd|ls|grep|curl|wget|sudo)\s/.test(trimmed) ||
		/\$\{|\$\(/.test(trimmed)
	) {
		return 'bash';
	}

	// JSON pattern
	if (
		/^\{[\s\S]*"[\w-]+"[\s\S]*:/.test(trimmed) ||
		/^\[[\s\S]*\{/.test(trimmed)
	) {
		return 'json';
	}

	// HTML/XML patterns
	if (/<[a-z][\s\S]*>/.test(trimmed)) {
		return 'html';
	}

	// CSS patterns
	if (/\{[\s\S]*[a-z-]+:\s*[^;]+;/.test(trimmed)) {
		return 'css';
	}

	return 'text';
}

function isCodeBlock(lines: string[]): boolean {
	if (lines.length < 2) return false;

	const nonEmptyLines = lines.filter(l => l.trim().length > 0);
	if (nonEmptyLines.length < 2) return false;

	// Check for common code patterns
	const codePatterns = [
		/^(import|export|const|let|var|function|class|def|package|use|fn|pub)\s/,
		/[{}\[\]();]/,
		/=>/,
		/:=|->|<-/,
		/\/\/|\/\*|\*\/|#|<!--/,
	];

	const matchCount = nonEmptyLines.filter(line =>
		codePatterns.some(pattern => pattern.test(line.trim())),
	).length;

	// If more than 30% of lines match code patterns, likely code
	return matchCount / nonEmptyLines.length > 0.3;
}

export interface InlineElement {
	type: 'text' | 'code' | 'bold' | 'italic';
	content: string;
}

export function parseMarkdown(content: string): MarkdownElement[] {
	const lines = content.split('\n');
	const elements: MarkdownElement[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		// Handle markdown code blocks
		if (line.startsWith('```')) {
			const codeBlocks: string[] = [];
			const language = line.substring(3).trim() || 'text';
			i++; // Skip opening ```
			while (i < lines.length && !lines[i].startsWith('```')) {
				codeBlocks.push(lines[i]);
				i++;
			}
			elements.push({
				type: 'code-block',
				content: codeBlocks.join('\n'),
				language,
			});
			continue;
		}

		// Handle headings
		if (line.startsWith('#')) {
			const level = line.match(/^#{1,6}/)?.[0].length || 1;
			const text = line.replace(/^#{1,6}\s*/, '');
			elements.push({
				type: 'heading',
				content: text,
				level,
			});
			continue;
		}

		// Handle mixed content lines (with inline code, bold, italic)
		if (
			line.includes('`') ||
			line.includes('**') ||
			(line.includes('*') && !line.includes('**'))
		) {
			elements.push({
				type: 'mixed-line',
				content: line,
			});
			continue;
		}

		// Detect plain code blocks (non-markdown format)
		if (i < lines.length - 1) {
			const potentialCodeLines: string[] = [line];
			let j = i + 1;

			// Collect consecutive lines that might be code
			while (
				j < lines.length &&
				!lines[j].startsWith('#') &&
				!lines[j].startsWith('```')
			) {
				potentialCodeLines.push(lines[j]);
				j++;

				// Stop if we hit an empty line followed by non-code content
				if (
					lines[j - 1].trim() === '' &&
					j < lines.length &&
					lines[j].trim() !== '' &&
					!/(^[{}\[\]();]|import|export|const|let|var|function|class|def)/.test(
						lines[j],
					)
				) {
					break;
				}
			}

			// Check if this is a code block
			if (isCodeBlock(potentialCodeLines)) {
				const codeContent = potentialCodeLines.join('\n');
				const language = detectLanguage(codeContent);
				elements.push({
					type: 'code-block',
					content: codeContent,
					language,
				});
				i = j - 1; // Skip processed lines
				continue;
			}
		}

		// Regular text
		elements.push({
			type: 'text',
			content: line || ' ',
		});
	}

	return elements;
}

export function parseInlineElements(content: string): InlineElement[] {
	const elements: InlineElement[] = [];
	let remaining = content;

	while (remaining.length > 0) {
		// Check for inline code first (highest priority)
		const codeMatch = remaining.match(/^(.*?)(`[^`]+`)(.*)/);
		if (codeMatch) {
			// Add text before code if any (but don't recurse to avoid infinite loops)
			if (codeMatch[1]) {
				elements.push({
					type: 'text',
					content: codeMatch[1],
				});
			}
			// Add code element
			elements.push({
				type: 'code',
				content: codeMatch[2].slice(1, -1), // Remove backticks
			});
			remaining = codeMatch[3];
			continue;
		}

		// Check for bold
		const boldMatch = remaining.match(/^(.*?)(\*\*[^*]+\*\*)(.*)/);
		if (boldMatch) {
			// Add text before bold if any (but don't recurse to avoid infinite loops)
			if (boldMatch[1]) {
				elements.push({
					type: 'text',
					content: boldMatch[1],
				});
			}
			// Add bold element
			elements.push({
				type: 'bold',
				content: boldMatch[2].slice(2, -2), // Remove **
			});
			remaining = boldMatch[3];
			continue;
		}

		// Check for italic
		const italicMatch = remaining.match(/^(.*?)(\*[^*]+\*)(.*)/);
		if (italicMatch) {
			// Add text before italic if any (but don't recurse to avoid infinite loops)
			if (italicMatch[1]) {
				elements.push({
					type: 'text',
					content: italicMatch[1],
				});
			}
			// Add italic element
			elements.push({
				type: 'italic',
				content: italicMatch[2].slice(1, -1), // Remove *
			});
			remaining = italicMatch[3];
			continue;
		}

		// No more markdown found, add remaining as text
		elements.push({
			type: 'text',
			content: remaining,
		});
		break;
	}

	return elements;
}
