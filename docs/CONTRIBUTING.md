# Contributing to ClickUp MCP Server - Enhanced

Thank you for your interest in contributing to the ClickUp MCP Server - Enhanced! This document provides guidelines and instructions for contributing to this project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Adding New Features](#adding-new-features)
- [Reporting Bugs](#reporting-bugs)
- [Feature Requests](#feature-requests)

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Getting Started

1. Ensure you have Node.js 18.0.0 or higher installed
2. Fork the repository on GitHub
3. Clone your fork locally:
   ```bash
   git clone https://github.com/nsxdavid/clickup-server.git
   cd clickup-server
   ```
4. Install dependencies:
   ```bash
   npm install
   ```
4. Create a branch for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

1. Make your changes in your feature branch
2. Test your changes thoroughly
3. Commit your changes with clear, descriptive commit messages
4. Push your changes to your fork
5. Submit a pull request

## Pull Request Process

1. Ensure your code follows the project's coding standards
2. Update the README.md with details of changes if applicable
3. The pull request will be reviewed by maintainers
4. Address any feedback or requested changes
5. Once approved, your pull request will be merged

## Coding Standards

- Follow TypeScript best practices
- Use consistent formatting (the project uses ESLint and Prettier)
- Write clear, descriptive variable and function names
- Include JSDoc comments for public APIs
- Write unit tests for new functionality

### Linting Issues

The project currently has some linting issues that need to be fixed:

1. **String Quotes**: Use single quotes for strings instead of double quotes.
2. **Unused Variables**: Remove or use all declared variables.
3. **Console Statements**: Remove all `console.log` statements from production code.
4. **Any Types**: Avoid using the `any` type when possible. Specify more precise types.

You can run `npm run lint --fix` to automatically fix some of these issues. The CI workflow currently skips the linting step to allow for successful builds while these issues are being addressed.

## Adding New Features

### Adding New ClickUp API Functionality

1. **Understand the ClickUp API**: Review the [ClickUp API documentation](https://clickup.com/api) for the feature you want to add.

2. **Implement the API Client**:
   - Add the necessary methods to the appropriate client file in `src/clickup-client/`
   - Follow the existing patterns for error handling and response formatting

3. **Create MCP Tools**:
   - Add tool implementations in the appropriate file in `src/tools/`
   - Use Zod for input validation
   - Follow the existing error handling patterns

4. **Create MCP Resources** (if applicable):
   - Add resource implementations in the appropriate file in `src/resources/`
   - Define clear URI templates for accessing the resources

5. **Register Tools and Resources**:
   - Make sure your tools and resources are registered in the setup functions

6. **Update Documentation**:
   - Add documentation for your new tools and resources in the README.md

### Example: Adding a New Tool

```typescript
// In src/tools/your-feature-tools.ts
server.tool(
  'your_new_tool',
  {
    param1: z.string().describe('Description of param1'),
    param2: z.number().optional().describe('Description of param2')
  },
  async ({ param1, param2 }) => {
    try {
      const result = await yourFeatureClient.yourMethod(param1, param2);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch (error: any) {
      console.error('Error in your_new_tool:', error);
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
);
```

## Reporting Bugs

When reporting bugs, please include:

1. A clear, descriptive title
2. Steps to reproduce the bug
3. Expected behavior
4. Actual behavior
5. Screenshots if applicable
6. Your environment (OS, Node.js version, etc.)

## Feature Requests

Feature requests are welcome. Please provide:

1. A clear, descriptive title
2. Detailed description of the proposed feature
3. Any relevant examples or use cases
4. If possible, a description of how you envision the implementation

Thank you for contributing to the ClickUp MCP Server - Enhanced!
