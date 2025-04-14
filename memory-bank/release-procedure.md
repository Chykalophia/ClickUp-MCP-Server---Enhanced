# Release Procedure

This document outlines the step-by-step process for releasing new versions of the ClickUp MCP Server.

## Pre-release Checklist

1. Ensure all changes are committed and pushed
2. Verify all tests pass (when implemented)
3. Check that the build process works: `npm run build`

## Version Update Process

### 1. Update CHANGELOG.md

1. Move all items from [Unreleased] to a new version section
2. Add the current date to the new version section
3. Keep the empty [Unreleased] section for future changes

Example:
```markdown
## [Unreleased]

### Added
### Changed
### Fixed

## [1.12.0] - 2025-04-14

### Added
- Added comprehensive descriptions to all MCP resources
```

### 2. Update package.json

1. Increment version number following semantic versioning:
   - MAJOR version for incompatible API changes
   - MINOR version for new functionality in a backward compatible manner
   - PATCH version for backward compatible bug fixes

```json
{
  "name": "clickup-mcp-server",
  "version": "1.12.0",
  ...
}
```

## Release Steps

### 1. Git Operations

1. Push version changes:
   ```bash
   git push
   ```

2. Create and push version tag:
   ```bash
   git tag -a v1.12.0 -m "Release v1.12.0: Brief description"
   git push --tags
   ```

### 2. NPM Publication

1. Build the package:
   ```bash
   npm run build
   ```

2. Publish to npm:
   ```bash
   npm publish --access public
   ```

3. Verify publication:
   ```bash
   npm view clickup-mcp-server version
   ```

### 3. GitHub Release

Create a GitHub release using the gh CLI:
```bash
gh release create v1.12.0 --title "v1.12.0" --notes "Release notes from CHANGELOG.md"
```

## Post-release Verification

1. Check npm package page: https://www.npmjs.com/package/clickup-mcp-server
2. Verify GitHub release page: https://github.com/nsxdavid/clickup-mcp-server/releases
3. Confirm the version is installable: `npm install clickup-mcp-server@latest`

## Version Naming Convention

- Git tags: `v1.12.0`
- Package version: `1.12.0`
- GitHub release title: `v1.12.0`

## Troubleshooting

### NPM Authentication Issues
If npm publish requires authentication:
1. Follow the browser authentication prompt
2. Wait for the authentication to complete
3. The publish process will continue automatically

### Git Tag Conflicts
If a tag already exists:
1. Delete local tag: `git tag -d v1.12.0`
2. Delete remote tag: `git push --delete origin v1.12.0`
3. Create new tag and push

## Important Notes

- Always update both package.json and CHANGELOG.md together
- Keep release notes clear and descriptive
- Follow semantic versioning strictly
- Test the package after release to ensure it's working as expected
