<h2 align="center">
 <br>
 <img src="docs/thumbnail.png" alt="Groq Code CLI" width="400">
 <br>
 <br>
 Groq Code CLI: A highly customizable, lightweight, and open-source coding CLI powered by Groq for instant iteration.
 <br>
</h2>

<p align="center">
 <a href="https://github.com/build-with-groq/groq-code-cli/stargazers"><img src="https://img.shields.io/github/stars/build-with-groq/groq-code-cli"></a>
 <a href="https://github.com/build-with-groq/groq-code-cli/blob/main/LICENSE">
 <img src="https://img.shields.io/badge/License-MIT-green.svg">
 </a>
</p>

<p align="center">
 <a href="#Overview">Overview</a> •
 <a href="#Installation">Installation</a> •
 <a href="#Usage">Usage</a> •
 <a href="#Development">Development</a>
</p>

<br>

https://github.com/user-attachments/assets/5902fd07-1882-4ee7-825b-50d627f8c96a

<br>

# Overview

Coding CLIs are everywhere. The Groq Code CLI is different. It is a blueprint, a building block, for developers looking to leverage, customize, and extend a CLI to be entirely their own. Leading open-source CLIs are all fantastic, inspiring for the open-source community, and hugely rich in features. However, that's just it: they are *gigantic*. Feature-rich: yes, but local development with such a large and interwoven codebase is unfriendly and overwhelming. **This is a project for developers looking to dive in.**

Groq Code CLI is your chance to make a CLI truly your own. Equipped with all of the features, tools, commands, and UI/UX that’s familiar to your current favorite CLI, we make it simple to add new features you’ve always wanted. By massively cutting down on bloat and code mass without compromising on quality, you can jump into modifying this CLI however you see fit. By leveraging models on Groq, you can iterate even faster (`/models` to see available models). Simply activate the CLI by typing `groq` in your terminal. Use Groq Code CLI in any directory just like you would with any other coding CLI. Use it in this directory to have it build and customize itself!

A few customization ideas to get started:
- New slash commands (e.g. /mcp, /deadcode, /complexity, etc.)
- Additional tools (e.g. web search, merge conflict resolver, knowledge graph builder, etc.)
- Custom start-up ASCII art
- Change the start-up command
- Anything you can think of!


## Installation

### For Development (Recommended)
```bash
git clone https://github.com/build-with-groq/groq-code-cli.git
cd groq-code-cli
npm install
npm run build
npm link        # Enables the `groq` command in any directory
```

```bash
# Run this in the background during development to automatically apply any changes to the source code
npm run dev  
```

### Run Instantly
```bash
# Using npx, no installation required
npx groq-code-cli@latest
```

### Install Globally
```bash
npm install -g groq-code-cli@latest
```

## Usage
```bash
# Start chat session
groq
```

### Command Line Options

```bash
groq [options]

Options:
  -t, --temperature <temp>      Temperature for generation (default: 1)
  -s, --system <message>        Custom system message
  -d, --debug                   Enable debug logging to debug-agent.log in current directory
  -p, --proxy <url>             Proxy URL (e.g. http://proxy:8080 or socks5://proxy:1080)
  -h, --help                    Display help
  -V, --version                 Display version number
```

### Authentication

On first use, start a chat:

```bash
groq
```

And type the `/login` command:

![Login](docs/login.png)
>Get your API key from the <strong>Groq Console</strong> [here](https://console.groq.com/keys)

This creates a .groq/ folder in your home directory that stores your API key, default model selection, and any other config you wish to add.

You can also set your API key for your current directory via environment variable:
```bash
export GROQ_API_KEY=your_api_key_here
```

### Proxy Configuration

Supports HTTP/HTTPS/SOCKS5 proxies via CLI flag or environment variables:

```bash
# CLI flag (highest priority)
groq --proxy http://proxy:8080
groq --proxy socks5://proxy:1080

# Environment variables
export HTTP_PROXY=http://proxy:8080
export HTTPS_PROXY=socks5://proxy:1080
```

Priority: `--proxy` > `HTTPS_PROXY` > `HTTP_PROXY`

### Available Commands
- `/help` - Show help and available commands
- `/login` - Login with your credentials
- `/model` - Select your Groq model
- `/provider` - Select your AI provider
- `/mcp` - Manage MCP (Model Context Protocol) servers
- `/new` - Start a new chat session
- `/resume` - Resume a previous session
- `/init` - Initialize project context
- `/clear` - Clear chat history and context
- `/reasoning` - Toggle display of reasoning content in messages
- `/stats` - Display session statistics and token usage

### MCP (Model Context Protocol) Support

This CLI supports the Model Context Protocol, allowing you to extend functionality with MCP servers that provide additional tools and resources.

#### What is MCP?

MCP (Model Context Protocol) is a standard protocol that allows AI applications to connect to external tools and data sources. MCP servers can provide:
- Additional tools (web search, database access, etc.)
- Resource access (files, APIs, knowledge bases)
- Custom integrations specific to your workflow

#### Managing MCP Servers

Use the `/mcp` command to open the MCP server management interface:

```bash
# In the CLI, type:
/mcp
```

**Available Actions:**
- **↑/↓ Navigate** - Move between servers
- **Enter** - Add new server
- **t** - Toggle server enabled/disabled
- **d** - Delete server
- **r** - Restart server
- **ESC** - Exit MCP management

#### Adding an MCP Server

When adding a new server, you'll be prompted for:

1. **Server name**: A unique identifier (e.g., "brave-search")
2. **Command**: The executable to run (e.g., "npx")
3. **Arguments**: Command arguments (e.g., "-y @modelcontextprotocol/server-brave-search")
4. **Tool prefix** (optional): Prefix for tool names to avoid conflicts (e.g., "brave")

**Example: Adding Brave Search**

```
Server name: brave-search
Command: npx
Arguments: -y @modelcontextprotocol/server-brave-search
Tool prefix: brave
```

This will create tools like `brave:web_search` that the AI can use.

#### Popular MCP Servers

- **@modelcontextprotocol/server-brave-search** - Web search via Brave
- **@modelcontextprotocol/server-filesystem** - File system access
- **@modelcontextprotocol/server-github** - GitHub API integration
- **@modelcontextprotocol/server-postgres** - PostgreSQL database access
- **@modelcontextprotocol/server-sqlite** - SQLite database access

Find more servers at: https://github.com/modelcontextprotocol/servers

#### Manual Configuration

You can also manually configure MCP servers by editing `~/.groq/local-settings.json`:

```json
{
  "mcpServers": {
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "toolPrefix": "brave",
      "disabled": false
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/directory"],
      "env": {
        "CUSTOM_VAR": "value"
      }
    }
  }
}
```

**Configuration Options:**
- `command`: Executable to run the MCP server
- `args`: Array of command-line arguments
- `toolPrefix`: Optional prefix for tool names (prevents naming conflicts)
- `disabled`: Set to `true` to disable without removing
- `env`: Optional environment variables for the server

#### How MCP Tools Work

Once an MCP server is connected:

1. The CLI automatically discovers tools provided by the server
2. Tools are registered with their prefixed names (e.g., `brave:web_search`)
3. The AI model can call these tools just like built-in tools
4. All MCP tools require approval before execution (for security)

#### Troubleshooting

**Server won't connect:**
- Check that the command and arguments are correct
- Ensure the MCP server package is installed (or use `npx` for automatic installation)
- Check `debug-agent.log` (run CLI with `-d` flag) for detailed error messages

**Tools not appearing:**
- Restart the server using the `r` key in `/mcp` management
- Verify the server is marked as connected (green ✓)
- Check that `disabled` is not set to `true`

**Naming conflicts:**
- Use the `toolPrefix` option to namespace tools from different servers
- Example: prefix "brave" creates `brave:web_search` instead of `web_search`


## Development

### Testing Locally
```bash
# Run this in the background during development to automatically apply any changes to the source code
npm run dev  
```

### Available Scripts
```bash
npm run build      # Build TypeScript to dist/
npm run dev        # Build in watch mode
```

### Project Structure

```
groq-code-cli/
├── src/
│   ├── commands/           
│   │   ├── definitions/        # Individual command implementations
│   │   │   ├── clear.ts        # Clear chat history command
│   │   │   ├── help.ts         # Help command
│   │   │   ├── login.ts        # Authentication command
│   │   │   ├── model.ts        # Model selection command
│   │   │   └── reasoning.ts    # Reasoning toggle command
│   │   ├── base.ts             # Base command interface
│   │   └── index.ts            # Command exports
│   ├── core/               
│   │   ├── agent.ts            # AI agent implementation
│   │   └── cli.ts              # CLI entry point and setup
│   ├── tools/              
│   │   ├── tool-schemas.ts     # Tool schema definitions
│   │   ├── tools.ts            # Tool implementations
│   │   └── validators.ts       # Input validation utilities
│   ├── ui/                 
│   │   ├── App.tsx             # Main application component
│   │   ├── components/     
│   │   │   ├── core/           # Core chat TUI components
│   │   │   ├── display/        # Auxiliary components for TUI display
│   │   │   └── input-overlays/ # Input overlays and modals that occupy the MessageInput box
│   │   └── hooks/          
│   └── utils/              
│       ├── constants.ts        # Application constants
│       ├── file-ops.ts         # File system operations
│       ├── local-settings.ts   # Local configuration management
│       └── markdown.ts         # Markdown processing utilities
├── docs/                   
├── package.json    
├── tsconfig.json        
└── LICENSE          
```

**TL;DR:** Start with `src/core/cli.ts` (main entry point), `src/core/agent.ts`, and `src/ui/hooks/useAgent.ts` (bridge between TUI and the agent). Tools are in `src/tools/`, slash commands are in `src/commands/definitions/`, and customize the TUI in `src/ui/components/`.

### Customization

#### Adding New Tools

Tools are AI-callable functions that extend the CLI's capabilities. To add a new tool:

1. **Define the tool schema** in `src/tools/tool-schemas.ts`:
```typescript
export const YOUR_TOOL_SCHEMA: ToolSchema = {
  type: 'function',
  function: {
    name: 'your_tool_name',
    description: 'What your tool does',
    parameters: {
      type: 'object',
      properties: {
        param1: { type: 'string', description: 'Parameter description' }
      },
      required: ['param1']
    }
  }
};
```

2. **Implement the tool function** in `src/tools/tools.ts`:
```typescript
export async function yourToolName(param1: string): Promise<ToolResult> {
  // Your implementation here
  return createToolResponse(true, result, 'Success message');
}
```

3. **Register the tool** in the `TOOL_REGISTRY` object and `executeTool` switch statement in `src/tools/tools.ts`.

4. **Add the schema** to `ALL_TOOL_SCHEMAS` array in `src/tools/tool-schemas.ts`.

#### Adding New Slash Commands

Slash commands provide direct user interactions. To add a new command:

1. **Create command definition** in `src/commands/definitions/your-command.ts`:
```typescript
import { CommandDefinition, CommandContext } from '../base.js';

export const yourCommand: CommandDefinition = {
  command: 'yourcommand',
  description: 'What your command does',
  handler: ({ addMessage }: CommandContext) => {
    // Your command logic here
    addMessage({
      role: 'system',
      content: 'Command response'
    });
  }
};
```

2. **Register the command** in `src/commands/index.ts` by importing it and adding to the `availableCommands` array.

#### Changing Start Command
To change the start command from `groq`, change `"groq"` in `"bin"` of `package.json` to your global command of choice.

Re-run `npm run build` and `npm link`.


## Contributing and Support

Improvements through PRs are welcome!

For issues and feature requests, please open an issue on GitHub.

#### Share what you create with Groq on our [socials](https://x.com/GroqInc)!

### Featured Community Creations
- [OpenRouter Support](https://github.com/rahulvrane/groq-code-cli-openrouter) - rahulvrane
