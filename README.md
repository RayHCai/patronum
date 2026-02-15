# Patronum - AI-Powered Cognitive Stimulation Therapy

## Inspiration
Dementia affects over 55 million people worldwide, yet access to effective treatment remains deeply unequal. Cognitive Stimulation Therapy (CST) — a structured program of themed activities proven to improve memory, reasoning, and social engagement — is [most effective in group settings](https://pubmed.ncbi.nlm.nih.gov/34942157/). But for patients in rural or underserved areas, attending regular group sessions often means long, impractical travel. Meanwhile, family caregivers are stretched to their limits, reporting mental breakdowns, burnout, and zero time for themselves. We wanted to build something that bridges the access gap for patients while giving caregivers the visibility and breathing room they desperately need.

## What it does
Patronum is an intelligent platform that enables dementia patients to participate in simulated group CST sessions with humanlike AI participants and a moderator. Designed as a supplement to in-person therapy, it allows patients to engage in more frequent sessions at their own convenience. It has 4 main features:

- **Simulated Group Sessions:** An AI moderator guides structured CST activities with up to 5 AI participants and the patient, preserving the social dynamics critical to CST's effectiveness
- **Photo-Based Memory Stimulation:** Sessions incorporate family-uploaded photos and web-retrieved images, prompting participants to describe, interpret, and react to visual cues to strengthen recall and communication skills
- **Caregiver Dashboard:** Caregivers can assign sessions, upload photos, and view an analytics dashboard with session summaries, engagement metrics, memory performance trends, and social interaction data
- **Automated Alerts:** The system flags significant drops in engagement or cognitive performance across sessions, surfacing concerns early

### Additional features
- Session summaries written in plain language so caregivers can quickly understand patient engagement without reviewing full transcripts
- Adjustable session length and difficulty to match disease stage and patient stamina
- Trend tracking over time, replacing subjective observation with actionable data
- Reliable moments of caregiver respite during patient sessions

## How we built it
Our tech stack combines modern tools for a robust, scalable solution:

- **Frontend:** Built with React for a responsive, intuitive interface. Complex state management handles real-time session data and large analytics datasets seamlessly.
- **Backend:** Handles session orchestration, user management, and data persistence with a focus on low-latency performance across concurrent AI participants.
- **AI Processing:** Powered by Claude, our AI moderator and participants are carefully tuned for tone, safety, and clinical appropriateness — supportive and engaging without being condescending or confusing. Multiple AI agents run in real time with optimized prompting to keep conversations natural and responsive.
- **Real-time Updates:** WebSocket connections ensure live session updates and smooth caregiver dashboard experiences.

## Challenges we ran into
- **Performance Optimization:** Running multiple AI participants in real time while maintaining low latency required careful orchestration and prompt optimization to keep conversations natural and responsive
- **Tone and Safety:** Designing AI behavior that is supportive, patient, and clinically appropriate without being condescending or confusing required extensive iteration and testing
- **Meaningful Metrics:** Translating raw conversational data into caregiver-friendly insights without overwhelming them was challenging, requiring a balance of clinical relevance with simplicity

## Accomplishments that we're proud of
- Built a realistic group CST experience that preserves the social interaction central to its therapeutic effectiveness
- Created caregiver analytics that surface meaningful trends instead of raw data
- Demonstrated how generative AI can support evidence-based healthcare interventions rather than replace human care
- Developed a system accessible through any modern browser with minimal setup

## What we learned
- Advanced real-time AI orchestration across multiple concurrent agents
- Real-time data handling with WebSocket connections for live session updates
- AI prompt optimization for sensitive healthcare contexts and edge cases
- Complex state management in React applications with large datasets
- The critical importance of balancing clinical rigor with user-friendly design

## What's next for Patronum
Future enhancements we're planning:

### 1. Expanded Accessibility
- Multiple language support
- Voice-first interaction modes for patients with limited dexterity
- Mobile-optimized experience

### 2. Healthcare Integration
- Integration with existing healthcare systems for provider-assigned sessions
- Exportable reports for clinician review
- Standardized outcome measures aligned with clinical CST frameworks

### 3. Enhanced Security & Privacy
- End-to-end data encryption to protect patient information
- HIPAA compliance tooling
- Granular access controls for multi-caregiver households

### 4. Richer Sessions
- Wider variety of conversation topics and activity types
- Adaptive difficulty that responds to real-time patient engagement
- Personalized session themes based on patient history and preferences

Our vision is to make evidence-based cognitive stimulation accessible to every dementia patient, regardless of geography, while empowering caregivers with the tools and time they need to sustain their own wellbeing.

## Built With
Claude Code
