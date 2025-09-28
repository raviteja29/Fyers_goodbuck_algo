# Contributing to AI Filmmaking Project

## Git Workflow

This project uses a **main branch workflow** with Pull Requests (PRs) for all contributions.

### Branch Structure

- **`main`** - The primary integration branch
  - Always contains production-ready code
  - All feature branches must merge into `main` via Pull Requests
  - Direct commits to `main` are not allowed (except for repository administrators)

### Development Workflow

1. **Create a Feature Branch**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**
   - Work on your feature in the feature branch
   - Make focused, atomic commits with clear messages
   - Follow the project structure and coding standards

3. **Push Your Branch**
   ```bash
   git push -u origin feature/your-feature-name
   ```

4. **Create a Pull Request**
   - Open a PR from your feature branch to `main`
   - Provide a clear description of changes
   - Reference any related issues
   - Request review from team members

5. **Code Review Process**
   - All PRs require at least one approval before merging
   - Address any feedback from reviewers
   - Ensure all checks pass (if CI/CD is configured)

6. **Merge and Cleanup**
   - Once approved, the PR can be merged to `main`
   - Delete the feature branch after successful merge
   ```bash
   git checkout main
   git pull origin main
   git branch -d feature/your-feature-name
   git push origin --delete feature/your-feature-name
   ```

### Branch Naming Convention

Use descriptive branch names with the following prefixes:

- `feature/` - New features or enhancements
- `bugfix/` - Bug fixes
- `hotfix/` - Critical fixes that need immediate attention
- `docs/` - Documentation updates
- `refactor/` - Code refactoring without functionality changes
- `test/` - Adding or updating tests

Examples:
- `feature/script-generation`
- `bugfix/audio-sync-issue`
- `docs/update-quick-start`
- `refactor/storyboard-structure`

### Commit Message Guidelines

Write clear, descriptive commit messages:

```
type(scope): brief description

- Use present tense ("Add feature" not "Added feature")
- Limit the first line to 72 characters
- Reference issues when applicable (#123)
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Project Structure Guidelines

When contributing, respect the project structure:

```
ai-film-making/
├── 01-preproduction/     # Planning and preparation
├── 02-production/        # Active filming/creation
├── 03-postproduction/    # Editing and finishing
├── assets/               # Media files
│   ├── audio/
│   ├── images/
│   └── video/
├── CONTRIBUTING.md       # This file
├── README.md            # Project overview
└── *.md                 # Guide files
```

### Pull Request Guidelines

**Before creating a PR:**
- [ ] Test your changes thoroughly
- [ ] Update documentation if needed
- [ ] Ensure code follows project standards
- [ ] Rebase on latest `main` if necessary

**PR Title Format:**
```
type(scope): Brief description of changes
```

**PR Description should include:**
- Summary of changes
- Motivation and context
- Screenshots/examples if applicable
- Checklist of completed items
- Any breaking changes

### Code Review Checklist

Reviewers should verify:
- [ ] Code follows project structure and conventions
- [ ] Changes are well-tested and functional
- [ ] Documentation is updated if necessary
- [ ] No sensitive information is committed
- [ ] Branch is up to date with `main`

## Questions?

If you have questions about the contribution process, please:
1. Check existing issues and discussions
2. Review the project documentation
3. Ask questions in PR comments
4. Contact the project maintainers

Thank you for contributing to the AI Filmmaking project! 🎬