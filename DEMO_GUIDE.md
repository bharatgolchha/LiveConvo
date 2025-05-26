# LiveConvo - Demo Guide

## 🎯 How to Experience the Full Simulation

Our beautiful LiveConvo interface is now ready! Here's how to see all the features in action:

### 🚀 Getting Started

1. **Start the application**
   ```bash
   cd frontend
   npm run dev
   ```
   Navigate to `http://localhost:3000`

2. **Interface Overview**
   - **Left Panel**: Context & Files upload
   - **Center Panel**: Live transcript with audio controls
   - **Right Panel**: AI guidance suggestions

### 📋 Demo Scenario: Sales Discovery Call

**Setup (30 seconds)**
1. **Upload Context Files**
   - Drag and drop any PDF, DOCX, or image files
   - Watch the beautiful upload animations and progress bars
   - See file validation and processing simulation

2. **Add Quick Context** (Optional)
   - Click on the pre-loaded context templates
   - "Sales Discovery Template"
   - "Company Research Notes"
   - "Product Demo Script"

**Live Session (2-3 minutes)**
3. **Start Recording**
   - Click the blue "Start Recording" button
   - Grant microphone permissions when prompted
   - Watch the audio level visualizer respond to your voice

4. **See Live Features in Action**
   - **Real-time Transcript**: Simulated transcript appears every 3-5 seconds
   - **AI Guidance**: Color-coded suggestions appear after 10-15 seconds:
     - 🟢 **Ask** (Green): "Ask about their current pain points..."
     - 🟡 **Clarify** (Yellow): "Clarify what they mean by scalability..."
     - 🔴 **Avoid** (Red): "Avoid mentioning pricing too early..."
   - **Live Stats**: Session duration, transcript lines, active guidance count
   - **Recording Indicator**: Pulsing red dot with timer in header

5. **Interactive Elements**
   - **Dismiss Guidance**: Click the X on any guidance chip
   - **Provide Feedback**: Use thumbs up/down on suggestions
   - **Pause/Resume**: Control recording with pause button
   - **Audio Visualization**: See the blue gradient respond to audio levels

**Session End**
6. **Stop Recording**
   - Click the red "Stop" button
   - In a real implementation, this would generate a summary

### ✨ Key Visual Features

#### Design Highlights
- **Modern gradient background**: Blue to purple gradient
- **Glass-morphism header**: Semi-transparent with backdrop blur
- **Smooth animations**: Framer Motion for all interactions
- **Color-coded guidance**: Intuitive green/yellow/red system
- **Real-time indicators**: Pulsing animations for active states
- **Beautiful typography**: Inter font with proper spacing

#### Interactive Animations
- **Hover effects**: Cards lift slightly on hover
- **Button animations**: Scale and color transitions
- **File upload**: Drag states with color changes
- **Guidance chips**: Slide in from right with staggered timing
- **Transcript lines**: Fade up animation for new entries
- **Audio visualizer**: Real-time width animation based on audio

### 🎨 Component Showcase

#### File Upload
- **Drag & Drop Zone**: Changes color on drag over
- **Multiple file support**: Up to 5 files, 25MB each
- **File type validation**: PDF, DOCX, TXT, PNG, JPG
- **Progress animations**: Smooth progress bars
- **File icons**: Different colors for different file types

#### Audio Controls
- **Permission handling**: Clean error state for denied permissions
- **Visual feedback**: Recording indicator with pulsing dot
- **Duration tracking**: Real-time session timer
- **Audio level**: Blue gradient shows microphone input
- **Control states**: Start, pause, resume, stop with proper icons

#### Guidance System
- **Three types**: Ask (green), Clarify (yellow), Avoid (red)
- **Confidence scores**: Percentage shown for each suggestion
- **Interactive feedback**: Thumbs up/down buttons
- **Dismissible**: X button to remove suggestions
- **Smart timing**: Maximum 3 suggestions at once

### 📊 Simulated Data

The demo includes realistic simulated data:

**Transcript Samples**:
- "Hello, I'm here to discuss our quarterly results"
- "Our revenue has grown by 25% this quarter"
- "I'd like to focus on three key areas today"
- "First, let's talk about market expansion"

**Guidance Examples**:
- **Ask**: "Ask about their current pain points with their existing solution" (92% confidence)
- **Clarify**: "Clarify what they mean by 'scalability issues'" (87% confidence)
- **Avoid**: "Avoid mentioning pricing too early. Focus on value proposition first" (94% confidence)

### 🚀 Next Steps

This beautiful interface demonstrates:
- ✅ Professional, modern design
- ✅ Intuitive three-pane layout
- ✅ Real-time audio processing simulation
- ✅ AI-powered guidance system
- ✅ Smooth animations and interactions
- ✅ Responsive design principles
- ✅ Accessibility considerations

**Ready for backend integration** when the FastAPI server is implemented!

---

## 💡 Pro Tips

1. **Test on different screen sizes** - The interface is fully responsive
2. **Try the drag and drop** - Upload real files to see the validation
3. **Speak into your microphone** - The audio visualizer responds to real audio
4. **Watch the timing** - Guidance appears naturally during conversations
5. **Use keyboard navigation** - All interactive elements are accessible

**Experience the future of conversation intelligence! 🎯** 