# Miruban

> A full-stack collaborative project management platform built with the PERN stack to help teams organize projects, assign tasks, collaborate efficiently, and manage software development workflows.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=white)

---

## Overview

Miruban is a modern project management platform inspired by tools such as Trello, Jira, and ClickUp. It enables teams to organize projects, manage Kanban boards, assign work, collaborate with teammates, and track project progress through a clean and intuitive interface.

Rather than simply recreating an existing Kanban application, this project focuses on building a scalable software architecture with secure authentication, relational database design, cloud storage integration, and production-ready development practices.

This project was developed as a portfolio application to strengthen my experience in full-stack software engineering, backend architecture, database design, deployment, and AI-assisted development workflows.

---

## Features

### Authentication

- Secure JWT authentication
- Password hashing using bcrypt
- Protected API routes
- Persistent login sessions

### Project Management

- Create and manage multiple projects
- Invite collaborators
- Project member management
- Role-based project permissions
- Project settings

### Task Management

- Kanban board workflow
- Drag-and-drop task management
- Due dates
- Priority levels
- Task descriptions
- Categories
- Progress tracking
- Subtasks
- Attachments

### Collaboration

- Friend system
- Project invitations
- Team collaboration
- Member management

### File Management

- Supabase Storage integration
- File uploads
- Image attachments
- Attachment validation

### Backend

- RESTful API
- MVC architecture
- Modular routing
- Input validation
- Error handling
- PostgreSQL relational database

---

# Tech Stack

## Frontend

- React
- React Router
- JavaScript
- CSS

## Backend

- Node.js
- Express.js
- PostgreSQL
- JWT
- Multer

## Cloud & Deployment

- Supabase
- Render
- Vercel

## Development Tools

- Git
- GitHub
- Postman
- VS Code

---

# Architecture

```
React Frontend
        │
REST API (HTTP)
        │
Express.js Backend
        │
Controllers
        │
Services
        │
Models
        │
PostgreSQL
        │
Supabase Storage
```

---

# Database Design

The application uses a normalized PostgreSQL database consisting of multiple related entities, including:

- Users
- Friend Requests
- Projects
- Project Members
- Boards
- Tasks
- Categories
- Subtasks
- Task Assignments
- Attachments

The schema was designed to reduce redundancy while maintaining referential integrity through foreign keys and relational constraints.

---

# Engineering Decisions

## Why PostgreSQL?

The application's data is highly relational. Users, projects, tasks, members, attachments, and permissions all share structured relationships that benefit from foreign keys, joins, and transactional consistency.

PostgreSQL provides excellent support for relational modeling while ensuring data integrity as the application scales.

---

## Why MVC Architecture?

The backend follows an MVC-inspired architecture to separate routing, controllers, business logic, and database operations.

Separating concerns keeps the project easier to maintain, improves readability, and simplifies future feature additions without tightly coupling components.

---

## Why JWT Authentication?

The frontend and backend are deployed as independent services.

JWT enables stateless authentication, making it easy to securely authorize API requests without maintaining server-side sessions.

---

## Why Role-Based Access Control?

Projects often involve multiple collaborators with different responsibilities.

Instead of granting every user identical permissions, the application uses role-based authorization to ensure users only perform actions appropriate to their role within a project.

This design also makes future permission expansion significantly easier.

---

## Why Supabase Storage?

Uploaded files are stored in Supabase Storage instead of PostgreSQL.

Keeping large files in object storage reduces database size, improves scalability, and allows PostgreSQL to remain focused on structured application data.

The database stores only file metadata and storage references.

---

## Why Normalize the Database?

The database schema follows normalization principles to minimize duplicated information.

Relationships between users, projects, boards, tasks, subtasks, assignments, and attachments are represented using foreign keys instead of repeated data, improving consistency and simplifying updates.

---

# AI-Assisted Development

This project was developed using AI-assisted software engineering practices rather than relying on AI to generate complete applications.

## AI Tools Used

- Claude Code
- OpenCode
- Cursor
- GitHub Copilot
- Codex

## AI Assisted With

- Understanding unfamiliar implementations
- Generating boilerplate code
- Suggesting alternative implementations
- Refactoring ideas
- Debugging assistance
- Documentation
- Code explanations

## My Responsibilities

Every AI-generated contribution was manually reviewed before being committed.

I was responsible for:

- Overall software architecture
- Database design
- API development
- Authentication implementation
- Feature planning
- Code review
- Debugging
- Testing
- Refactoring
- Deployment
- Final engineering decisions

AI accelerated development, but all implementation decisions were ultimately designed, reviewed, and validated by me.

---

# Challenges

Throughout development, I encountered several engineering challenges, including:

- Designing a normalized relational database
- Building secure JWT authentication
- Implementing role-based permissions
- Synchronizing frontend and backend state
- Integrating Supabase Storage
- Refactoring backend modules as the application grew
- Debugging deployment issues between Vercel and Render
- Improving maintainability through modular architecture

---

# Lessons Learned

Developing Miruban strengthened my understanding of:

- Full-stack application architecture
- REST API development
- PostgreSQL schema design
- Authentication and authorization
- Cloud deployment
- Software debugging
- Refactoring large codebases
- AI-assisted software engineering
- Git workflows and version control

---

# Project Timeline

## Phase 1

- Project planning
- Database design
- Authentication
- Initial backend architecture

## Phase 2

- Project management
- Kanban boards
- Task management
- Member invitations

## Phase 3

- Friend system
- File attachments
- UI improvements
- Database optimization

## Ongoing

- Bug fixes
- Performance improvements
- Feature expansion
- Codebase refactoring

---

# Future Improvements

- Real-time collaboration using WebSockets
- Calendar view
- Email notifications
- Team analytics dashboard
- Activity history
- Advanced search and filtering
- Unit testing
- Integration testing
- CI/CD pipeline
- Dockerized deployment

---

## Install frontend dependencies

```bash
cd frontend
npm install
```

## Install backend dependencies

```bash
cd ../backend
npm install
```

## Configure environment variables

Create a `.env` file inside the backend directory.

Example:

```env
PORT=5000

DATABASE_URL=your_database_url

JWT_SECRET=your_secret

SUPABASE_URL=your_supabase_url

SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Start the backend

```bash
npm run dev
```

## Start the frontend

```bash
npm run dev
```

---

# Live Demo

Frontend:
https://your-vercel-url.vercel.app

Backend:
https://your-render-url.onrender.com

---

# Author

**Jayvee N. Bernaldez**

- Portfolio: https://dev-vee-portfolio.vercel.app
- LinkedIn: https://www.linkedin.com/in/jayvee-bernaldez-dev
- GitHub: https://github.com/V030

---
