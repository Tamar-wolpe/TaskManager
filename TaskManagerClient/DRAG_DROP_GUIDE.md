# 🎯 Drag and Drop Implementation Guide

## Overview
Implemented drag and drop functionality for tasks using Angular CDK (Component Development Kit). Tasks can now be moved between columns (Backlog → In Progress → Done) with real-time server synchronization.

## Architecture

### 1. **Frontend Implementation** (task-board.ts)

#### Imports
```typescript
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
```

#### Component Setup
- **DragDropModule** added to imports array (standalone component)
- Signals for reactive state management:
  - `tasks`: All tasks for the project
  - `loading`: Loading state
  - `error`: Error messages

#### Key Methods

**onTaskDropped(event: CdkDragDrop<any[]>, newStatus: string)**
- Main handler for when user drops a task
- Detects if task moved to different column
- Performs optimistic update (local first, then server)
- Handles server sync with proper error recovery

```typescript
onTaskDropped(event: CdkDragDrop<any[]>, newStatus: string) {
  const task = event.item.data;
  const oldStatus = task.status;

  if (oldStatus !== newStatus) {
    // Optimistic update
    this.updateTaskLocal(task.id, newStatus);
    
    // Server sync
    this.api.updateTask(task.id, { status: newStatus }).subscribe({
      next: () => console.log('✅ Task updated'),
      error: (err) => {
        alert('שגיאה בעדכון משימה');
        // Rollback if server fails
        this.updateTaskLocal(task.id, oldStatus);
      }
    });
  }
}
```

**updateTaskLocal(taskId: string, newStatus: string)**
- Updates task status in local signal immediately
- Provides instant visual feedback to user
- Called before server request (optimistic update pattern)

### 2. **HTML Template** (task-board.html)

#### Drop Zones with CDK
```html
<div 
  cdkDropList
  #taskList="cdkDropList"
  [id]="'drop-' + status"
  [cdkDropListData]="getTasksByStatus(status)"
  [cdkDropListConnectedTo]="['drop-backlog', 'drop-in-progress', 'drop-done']"
  (cdkDropListDropped)="onTaskDropped($event, status)"
  class="drop-zone">
```

**Key Attributes:**
- `cdkDropList`: Declares this as drop zone
- `[id]`: Unique identifier for each column
- `[cdkDropListConnectedTo]`: Allows dragging between connected lists
- `[cdkDropListData]`: Data source for dropped items
- `(cdkDropListDropped)`: Event handler for drop action

#### Draggable Cards
```html
<div 
  cdkDrag
  [cdkDragData]="task"
  class="task-card"
  cdkDragPreview>
```

**Key Attributes:**
- `cdkDrag`: Makes element draggable
- `[cdkDragData]`: Data passed with drag event
- `cdkDragPreview`: Custom preview shown during drag

### 3. **Styling** (task-board.css)

#### Drop Zone States
```css
.drop-zone {
  min-height: 400px;
  border: 2px dashed #ddd;
  background-color: #f0f0f0;
  transition: all 0.3s ease;
}

.cdk-drop-list-dragging {
  background-color: #e8f5e9;  /* Highlight during drag */
  border: 2px dashed #4caf50;
}
```

#### Task Card States
```css
.task-card {
  cursor: grab;
  transition: all 0.2s ease;
}

.task-card:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}

.task-card.cdk-drag-preview {
  box-shadow: 0 5px 15px rgba(0,0,0,0.3);
  opacity: 0.8;
}

.cdk-drag-placeholder {
  opacity: 0.4;
  background: #ddd;
}
```

## User Experience Flow

### Step 1: Drag Initiation
1. User hovers over task card → cursor changes to `grab`
2. Card shows slight elevation (box-shadow increase)

### Step 2: During Drag
1. Dragging column highlights in green
2. Other columns show dashed green border (ready to accept)
3. Ghost preview follows cursor with reduced opacity
4. Empty placeholder shown in original position

### Step 3: Drop Completion
1. Task moved to new column immediately (optimistic update)
2. Server request sent to update status
3. If server succeeds: ✅ persisted
4. If server fails: ❌ reverted to original column with alert

### Step 4: Feedback
- Console logs show status changes: "📤 Moving task from backlog to in-progress"
- Success: "✅ Task updated on server"
- Error: Alert shown and task reverted

## API Integration

### updateTask Method
```typescript
// src/app/services/api.ts
updateTask(taskId: string, updates: any): Observable<any> {
  return this.http.patch<any>(
    `${this.baseUrl}/tasks/${taskId}`,
    updates
  );
}
```

**Expected Backend Endpoint:**
```
PATCH /api/tasks/:taskId
Body: { status: "in-progress" }
Response: { id, title, status, ... }
```

## Backend Requirements

### Database
- Tasks table must have `status` column (enum: 'backlog', 'in-progress', 'done')
- Support PATCH endpoint for partial updates

### API Endpoint
```javascript
// Express example
app.patch('/api/tasks/:id', authenticateToken, (req, res) => {
  const { status } = req.body;
  // Update task status in database
  // Return updated task
});
```

## Features Implemented

✅ **Multi-column drag and drop**
- Move between 3 columns (Backlog, In Progress, Done)
- Drag and drop between any columns

✅ **Optimistic updates**
- Immediate visual feedback (no loading spinner)
- Smooth animations during transitions
- Rollback on server error

✅ **Visual feedback**
- Cursor changes during hover and drag
- Column highlights during drag
- Placeholder shows during movement
- Smooth transitions with CSS animations

✅ **Error handling**
- Server errors show alert to user
- Failed updates automatically rollback
- Console logging for debugging

✅ **Accessibility**
- Works with mouse drag and drop
- Text properly labeled
- Columns properly grouped

## Testing Checklist

- [ ] Can drag task from backlog to in-progress
- [ ] Can drag task from in-progress to done
- [ ] Can drag task back from done to backlog
- [ ] Server updates correctly when dropping
- [ ] Failed server request reverts task to original column
- [ ] Loading state shows during initial load
- [ ] Error messages display properly
- [ ] All animations are smooth and responsive

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support (iOS 13+)

## Performance Notes

- **Optimistic updates** prevent UI lag
- **Signal-based** state for reactive updates
- **CSS animations** for smooth visual feedback
- **Lazy chunk loading** for task-board component

## Known Limitations

1. Requires connectivity to server for persistence
2. Concurrent edits from multiple users not handled (last-write-wins)
3. No undo/redo functionality
4. No drag preview customization per task

## Future Enhancements

- [ ] Drag handle (grab icon instead of full card)
- [ ] Custom drag preview with task thumbnail
- [ ] Sorting within columns (drag to reorder)
- [ ] Keyboard navigation (arrow keys to move)
- [ ] Undo/redo with optimistic updates
- [ ] Conflict resolution for concurrent edits
- [ ] Animations customization
