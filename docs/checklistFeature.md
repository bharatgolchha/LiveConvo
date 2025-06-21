# 📋 Checklist Tab Feature - Requirements & Implementation Plan

## 🎯 **Feature Overview**
Add a third tab called "Checklist" to the existing Summary | Timeline tab navigation, providing users with a simple task management interface for conversation prep and follow-up items.

## 🏗️ **Technical Architecture**

### **1. Database Schema**
```sql
CREATE TABLE prep_checklist (
    id                UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id        UUID  NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    text              TEXT  NOT NULL,
    status            TEXT  DEFAULT 'open' CHECK (status IN ('open', 'done')),
    created_at        TIMESTAMPTZ DEFAULT now(),
    created_by        UUID  REFERENCES users(id),
    
    -- Add indexes for performance
    INDEX idx_prep_checklist_session_id ON prep_checklist(session_id),
    INDEX idx_prep_checklist_status ON prep_checklist(status),
    INDEX idx_prep_checklist_created_at ON prep_checklist(created_at)
);

-- Row-level security (same pattern as timeline)
ALTER TABLE prep_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage checklist items for their organization's sessions" 
ON prep_checklist 
FOR ALL 
USING (
    session_id IN (
        SELECT s.id FROM sessions s
        JOIN organization_members om ON s.organization_id = om.organization_id
        WHERE om.user_id = auth.uid()
    )
);
```

### **2. API Endpoints**
```typescript
// GET /api/checklist?session=123
// Returns: ChecklistItem[]
interface ChecklistItem {
  id: string;
  text: string;
  status: 'open' | 'done';
  created_at: string;
  created_by?: string;
}

// POST /api/checklist
// Body: { sessionId: string, text: string }
// Returns: ChecklistItem

// PATCH /api/checklist/[id]
// Body: { status: 'open' | 'done' }
// Returns: ChecklistItem

// DELETE /api/checklist/[id]
// Returns: { success: boolean }

// GET /api/checklist/export?session=123
// Returns: Markdown formatted checklist for export
```

### **3. Frontend Components**

#### **Tab Integration**
- Update `ConversationContent.tsx` to support `'checklist'` tab type
- Extend tab navigation to include third tab: `| Summary | Timeline | Checklist |`
- Maintain existing tab switching behavior with React state

#### **Component Structure**
```
src/components/checklist/
├── ChecklistTab.tsx          # Main tab container
├── ChecklistItem.tsx         # Individual item with checkbox + text + delete
├── AddItemInput.tsx          # Input field for adding new items
└── ChecklistExport.tsx       # Export functionality (optional v2)
```

## 📱 **User Interface Design**

### **Tab Layout**
```
┌─────────────────────────────────────────────────┐
│ Summary | Timeline | Checklist (3/7)           │
├─────────────────────────────────────────────────┤
│ ☐ Call prospect to confirm meeting time         │
│ ☑ Review competitor pricing analysis            │
│ ☐ Prepare product demo slides                   │
│ ☐ Send follow-up email with proposal            │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ + Add new item...                           │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### **ChecklistItem Component**
```tsx
const ChecklistItem = ({ id, text, status, onToggle, onDelete }) => (
  <li className="flex items-center gap-2 p-2 hover:bg-muted/30 rounded-md group">
    <Checkbox 
      checked={status === 'done'} 
      onCheckedChange={() => onToggle(id)}
      disabled={updating}
    />
    <span className={cn(
      'text-sm flex-1',
      status === 'done' && 'line-through text-muted-foreground'
    )}>
      {text}
    </span>
    <Trash2 
      onClick={() => onDelete(id)} 
      className="ml-auto h-4 w-4 cursor-pointer opacity-0 group-hover:opacity-60 hover:opacity-100 text-destructive"
    />
  </li>
);
```

## 🔧 **Implementation Steps**

### **Phase 1: Database & API (30 mins)**
1. ✅ Add `prep_checklist` table to schema
2. ✅ Create `/api/checklist` routes (GET, POST)
3. ✅ Create `/api/checklist/[id]` routes (PATCH, DELETE)
4. ✅ Add proper authentication and session validation

### **Phase 2: Frontend Components (45 mins)**
1. ✅ Create `ChecklistTab.tsx` with data fetching
2. ✅ Create `ChecklistItem.tsx` with toggle/delete functionality  
3. ✅ Create `AddItemInput.tsx` with keyboard shortcuts
4. ✅ Add proper loading states and error handling

### **Phase 3: Tab Integration (15 mins)**
1. ✅ Update `ConversationContent.tsx` to support checklist tab
2. ✅ Add tab button with progress indicator `Checklist (3/7)`
3. ✅ Ensure consistent styling with existing tabs

### **Phase 4: AI Coach Integration (15 mins)**
1. ✅ Add "Add to Checklist" button in `GuidanceMessage.tsx`
2. ✅ Implement `addItemToChecklist()` function
3. ✅ Add optimistic updates for immediate UI feedback

## 🚀 **Enhanced UX Features**

### **Core Features (Phase 1)**
- ✅ **Progress Indicator**: `Checklist (3/7)` in tab header
- ✅ **Keyboard Shortcuts**: 
  - `c` to switch to checklist tab
  - `n` to focus add item input
  - `Enter` to add new item
- ✅ **Visual Feedback**: New items briefly highlight with animation
- ✅ **Auto-scroll**: Scroll to new items when added

### **Power User Features (Phase 2)**
- 🔄 **Bulk Actions**: "Clear Completed" button to remove done items
- 🔄 **Smart Suggestions**: AI-powered task breakdown suggestions
- 🔄 **Export Options**: Markdown export for copy/paste to external tools
- 🔄 **Drag & Drop**: Reorder checklist items by importance

### **AI Integration**
```tsx
// In GuidanceMessage.tsx
<Button 
  size="icon" 
  variant="ghost" 
  onClick={() => addItemToChecklist(suggestion.text)}
  className="opacity-0 group-hover:opacity-100"
>
  <Plus className="h-4 w-4"/>
</Button>
```

## 💰 **Cost & Performance Considerations**

### **Database Impact**
- **Minimal**: Simple table with basic CRUD operations
- **Indexing**: Optimized for session-based queries
- **Storage**: Text-only, very lightweight per item

### **API Cost**
- **Zero AI costs**: Pure CRUD operations, no LLM calls
- **Fast responses**: Simple database queries
- **Efficient**: Batch operations for bulk actions

### **Real-time Updates**
- **React State**: Optimistic updates for immediate feedback
- **No WebSockets**: Standard HTTP requests sufficient
- **Cache Strategy**: Keep items in component state during session

## 📊 **Success Metrics**

### **Adoption Metrics**
- % of users who create checklist items
- Average items per session
- Completion rate (checked vs unchecked)

### **Usage Patterns**
- Most common item types/patterns
- Time spent in checklist tab vs other tabs
- Integration with AI coach suggestions

### **Performance Metrics**
- API response times for checklist operations
- Time to first checklist interaction
- Error rates for checklist operations

## 🎮 **User Flows**

### **Primary Flow: Adding Items**
1. User clicks "Checklist" tab → switches to checklist view
2. User types in "Add new item..." input → text appears
3. User presses Enter → item added to list with animation
4. Progress indicator updates: `Checklist (4/7)`

### **AI Integration Flow**
1. AI Coach suggests: "Follow up with pricing proposal"
2. User clicks `+` button next to suggestion
3. Item instantly appears in checklist (optimistic update)
4. Background API call persists to database
5. User can immediately interact with new item

### **Completion Flow**
1. User checks off completed item → strikes through with animation
2. Progress indicator updates: `Checklist (5/7)`
3. Item moves to bottom of list (optional UX enhancement)
4. "Clear Completed" button becomes visible when items are done

---

**🚢 Ship Strategy**: Start with core functionality (database + basic UI), then iterate based on user feedback. Focus on simplicity and speed over features. 