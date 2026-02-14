## 8. API Routes

### Authentication Routes
```
POST   /api/auth/patient/signup            Create patient account
POST   /api/auth/patient/login             Patient login
POST   /api/auth/patient/logout            Patient logout
POST   /api/auth/patient/refresh           Refresh patient token

POST   /api/auth/admin/login               Admin login
POST   /api/auth/admin/logout              Admin logout
POST   /api/auth/admin/refresh             Refresh admin token
POST   /api/auth/admin/verify-2fa          Verify two-factor code

GET    /api/auth/me                        Get current authenticated user
```

### Patient Routes
```
POST   /api/participants                    Create participant
GET    /api/participants                    List participants
GET    /api/participants/:id               Get participant with agents
PUT    /api/participants/:id               Update participant details
DELETE /api/participants/:id               Deactivate participant

POST   /api/participants/:id/agents        Generate agent cohort
GET    /api/participants/:id/agents        Get agents
```

### Session Routes
```
POST   /api/sessions                       Create session { participantId, topic }
GET    /api/sessions/:id                   Get session with turns
POST   /api/sessions/:id/end              End session, trigger analytics + reinforcement gen
GET    /api/sessions/:id/audio            Get full session audio recording
GET    /api/sessions/:id/transcript       Get formatted transcript
GET    /api/sessions/:id/graph            Get conversation graph data
```

### Reinforcement Routes
```
GET    /api/participants/:id/reinforcement  Get due reinforcement items
POST   /api/reinforcement/:id/answer       Submit answer
GET    /api/reinforcement/:id/results      Get reinforcement results
```

### Analytics & Dashboard Routes
```
GET    /api/participants/:id/dashboard     Get longitudinal analytics data
GET    /api/participants/:id/sessions      List all sessions with basic analytics
GET    /api/participants/:id/analytics     Get detailed participant analytics
```

### Admin Routes
```
GET    /api/admin/patients                 List all patients (with filters, search, pagination)
GET    /api/admin/patients/:id            Get patient full profile
PUT    /api/admin/patients/:id            Update patient information
GET    /api/admin/patients/:id/sessions   Get all sessions for patient
GET    /api/admin/sessions/:id            Get detailed session view (audio, transcript, graph)
POST   /api/admin/patients/:id/notes      Add clinical note
GET    /api/admin/analytics/overview      System-wide analytics
```

### Internal Routes
```
POST   /api/speech/synthesize              Proxy to 11Labs (used internally by orchestrator)
```

WebSocket: `ws://localhost:3001/ws?sessionId=xxx&token=<auth_token>`

---

