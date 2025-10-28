# Recipe Matcher

A full-stack recipe matching application that helps users find recipes based on their available ingredients using advanced fuzzy matching algorithms, voice recognition, and ingredient normalization.

## 🏗️ Architecture

- **Frontend**: React + TypeScript + Vite + Material-UI
- **Backend**: AWS Lambda + API Gateway + DynamoDB (Single-Table Design)
- **Infrastructure**: AWS CDK (TypeScript)
- **Authentication**: JWT tokens
- **Voice Recognition**: Web Speech API
- **Fuzzy Matching**: Advanced ingredient normalization and similarity algorithms
- **Real-time**: WebSocket connections for live updates

## 🚀 Getting Started

### Prerequisites

- Node.js 20
- AWS CLI configured
- AWS CDK installed globally (`npm install -g aws-cdk`)

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

### Backend Development

```bash
cd backend
npm install
npm run build
npm run watch
```

### Deploy Infrastructure

```bash
cd backend
npm run cdk deploy
```

## 🎯 Features

### ✅ Implemented
- [x] **User Authentication** - JWT-based login/register with secure password hashing
- [x] **Voice Recognition** - Web Speech API for hands-free ingredient input
- [x] **Advanced Fuzzy Matching** - Intelligent ingredient normalization and similarity algorithms
- [x] **Smart Recipe Discovery** - Find recipes with partial ingredient matches
- [x] **Real-time Notifications** - WebSocket-based live updates
- [x] **Responsive Design** - Material-UI with mobile-first approach
- [x] **Ingredient Management** - Add, remove, and sync pantry ingredients
- [x] **Match Analysis** - Detailed breakdown of matched/missing ingredients
- [x] **Single-Table Database** - Optimized DynamoDB design for scalability

### 🚧 In Progress
- [ ] **Performance Optimization** - Database query optimization and caching
- [ ] **Match Analytics** - User behavior tracking and recipe popularity
- [ ] **Social Features** - Recipe sharing, ratings, and reviews
- [ ] **Mobile App** - React Native cross-platform development

## 🔧 API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/verify` - Verify JWT token
- `GET /auth/profile` - Get user profile
- `PUT /auth/profile` - Update user profile

### Ingredients
- `GET /ingredients` - List available ingredients
- `POST /ingredients` - Create new ingredient

### User Ingredients
- `GET /user-ingredients` - Get user's pantry ingredients
- `POST /user-ingredients` - Add ingredient to user's pantry
- `DELETE /user-ingredients` - Remove ingredient from pantry

### Recipes
- `GET /recipes` - List recipes with pagination
- `GET /recipes/{id}` - Get specific recipe details
- `POST /recipes` - Create recipe (authenticated)

### Enhanced Matching (v2)
- `POST /matching-v2/find-recipes` - **Advanced fuzzy matching** with ingredient normalization
- `POST /matching-v2/calculate-match` - Calculate detailed match percentage
- `POST /matching-v2/ingredient-analysis` - Analyze ingredient matching patterns

### WebSocket
- `wss://[your-websocket-url]/prod` - Real-time notifications and updates

## 🧠 Advanced Fuzzy Matching

The app uses sophisticated algorithms for intelligent ingredient matching:

### Ingredient Normalization
- **Text Processing**: Converts "chicken breast" → "chicken-breast"
- **Variation Generation**: Creates multiple forms (chicken, chicken-breast, chickenbreast)
- **Alternative Detection**: Maps "tomato" to "tomatoes", "onion" to "onions"
- **Similarity Scoring**: Uses Levenshtein distance for fuzzy matching

### Matching Algorithm
- **Exact Matches**: 100% score for identical ingredients
- **Partial Matches**: 90% for contained ingredients ("chicken" in "chicken breast")
- **Fuzzy Matches**: 60-85% based on similarity scores
- **Variation Matches**: 70%+ for generated variations

### Smart Recipe Discovery
- **Partial Ingredient Matching**: Find recipes with only some ingredients
- **Match Percentage Calculation**: Based on user ingredients matched, not total recipe ingredients
- **Missing Ingredient Analysis**: Shows what you need to buy
- **Ingredient Alternatives**: Suggests substitutions

## 🎤 Voice Recognition

The app supports voice input for adding ingredients:
- Click the microphone icon
- Speak ingredient names
- Automatic transcription to text
- Works in Chrome, Edge, and Safari

## 🔐 Authentication

- JWT-based authentication
- Secure password hashing with bcrypt
- Token stored in localStorage
- Automatic token verification

## 🚀 Deployment Status

The application is currently deployed on AWS with the following infrastructure:

### ✅ Deployed Components
- **API Gateway** - REST API endpoints
- **Lambda Functions** - 8 serverless functions for different operations
- **DynamoDB** - Single-table design with 3 tables
- **WebSocket API** - Real-time notifications
- **EventBridge** - Event-driven architecture
- **SNS** - Notification system

### 🔧 Infrastructure Stack
- **StatefulStack** - Database tables and persistent resources
- **StatelessStack** - Lambda functions, API Gateway, and compute resources

## 🧪 Development Scripts

### Backend
- `npm run build` - Build TypeScript
- `npm run watch` - Watch mode for development
- `npm run cdk deploy` - Deploy infrastructure
- `npm run cdk deploy --all` - Deploy all stacks
- `npm run test` - Run test suite

### Frontend
- `npm run dev` - Development server (http://localhost:5173)
- `npm run build` - Production build
- `npm run preview` - Preview production build
- `npm run test` - Run component tests

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.