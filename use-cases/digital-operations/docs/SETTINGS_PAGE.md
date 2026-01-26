# Settings Page Documentation

## Overview

The Settings page provides a user interface for viewing and updating the AI agent's system prompt. This allows administrators to customize the agent's behavior without requiring code changes or redeployment.

## Features

### System Prompt Management
- **View Current Prompt**: Displays the current system prompt stored in the database
- **Edit Prompt**: Large textarea with syntax highlighting for easy editing
- **Character Count**: Real-time character count display
- **Save Changes**: Persist updates to the database
- **Reset**: Revert unsaved changes back to the original prompt
- **Reload**: Refresh the prompt from the database

### User Experience
- **Change Detection**: Tracks unsaved changes and shows appropriate warnings
- **Loading States**: Visual feedback during database operations
- **Error Handling**: Clear error messages for failed operations
- **Success Feedback**: Confirmation when changes are saved successfully

## Navigation

The Settings page can be accessed through:
1. **Main Navigation**: Settings link in the top navigation bar
2. **User Menu**: Settings option in the user dropdown menu

## Technical Implementation

### Database Integration
- Uses GraphQL queries and mutations to interact with the Settings table
- Filters for records with `name = 'system_prompt'`
- Handles both create and update operations automatically

### State Management
- React hooks for local state management
- Tracks original vs. current prompt values
- Manages loading, saving, and error states

### UI Components
- Built with shadcn/ui components for consistent styling
- Responsive design that works on desktop and mobile
- Accessible form controls with proper labeling

## Usage Flow

1. **Access Settings**: Navigate to `/settings` or use the Settings link in navigation
2. **View Current Prompt**: The page loads and displays the current system prompt
3. **Edit Prompt**: Modify the text in the textarea as needed
4. **Save Changes**: Click "Save Changes" to persist updates to the database
5. **Agent Restart**: Changes take effect after the agent server is restarted

## Important Notes

### Agent Restart Required
- Changes to the system prompt are saved to the database immediately
- However, the agent server caches the system prompt at startup
- A server restart is required for changes to take effect in conversations

### Permissions
- The Settings page requires authentication
- Users must have appropriate permissions to read/write Settings records
- The Settings model uses owner-based authorization

### Fallback Behavior
- If the system prompt cannot be loaded from the database, an error is displayed
- The agent server includes a fallback default prompt for reliability
- Database errors don't prevent the agent from functioning

## Error Scenarios

### Common Issues
1. **Database Connection**: Network or authentication issues
2. **Missing Record**: System prompt not found in Settings table
3. **Permission Denied**: User lacks required permissions
4. **Validation Errors**: Invalid data format or constraints

### Error Handling
- All errors are caught and displayed to the user
- Detailed error messages help with troubleshooting
- Failed operations don't leave the UI in an inconsistent state

## Future Enhancements

### Potential Features
- **Prompt Templates**: Pre-defined prompt templates for different use cases
- **Version History**: Track changes and allow rollback to previous versions
- **Validation**: Syntax checking and prompt validation
- **Preview Mode**: Test prompt changes before saving
- **Multiple Prompts**: Support for different prompts per use case or user group