# Recipe Matcher

A full-stack recipe matching application that helps users find recipes based on their available ingredients using voice and text input.

## 🏗️ Architecture

- **Frontend**: React + TypeScript + Vite + Material-UI
- **Backend**: AWS Lambda + API Gateway + DynamoDB
- **Infrastructure**: AWS CDK (TypeScript)
- **Authentication**: JWT tokens
- **Voice Recognition**: Web Speech API

## 📁 Project Structure

```
recipe-matcher/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── context/         # React contexts (Auth, Recipe, Events)
│   │   ├── services/        # API services
│   │   └── App.tsx
│   └── package.json
├── backend/                 # AWS Lambda backend
│   ├── src/
│   │   ├── lambda-functions/ # Lambda handlers
│   │   ├── helpers/         # Shared utilities
│   │   ├── scripts/         # Data import scripts
│   │   └── lib/             # CDK constructs
│   └── package.json
├── infrastructure/          # CDK infrastructure definitions
└── mobile/                  # React Native mobile app (future)
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
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
- [x] User authentication (login/register)
- [x] Voice recognition for ingredient input
- [x] Recipe database with high-quality data
- [x] Smart recipe matching algorithm
- [x] Real-time notifications
- [x] Responsive Material-UI design

### 🚧 In Progress
- [ ] Recipe matching UI with percentage bars
- [ ] Social features (sharing, rating)
- [ ] Mobile app development

## 🔧 API Endpoints

### Authentication
- `POST /auth` - Login/Register/Verify

### Recipes
- `GET /recipes` - List recipes
- `GET /recipes/{id}` - Get specific recipe
- `POST /recipes` - Create recipe (authenticated)

### Ingredients
- `GET /ingredients` - List ingredients
- `POST /ingredients` - Create ingredient

### User Ingredients
- `GET /user-ingredients` - Get user's ingredients
- `POST /user-ingredients` - Add ingredient to user
- `DELETE /user-ingredients` - Remove ingredient from user

### Matching
- `POST /matching/find-recipes` - Find matching recipes
- `POST /matching/calculate-match` - Calculate match percentage

## 🗄️ Database Schema

### Recipes Table
- `recipeId` (PK) - Unique recipe identifier
- `userId` - Recipe owner
- `title` - Recipe name
- `ingredients` - Array of ingredient objects
- `instructions` - Array of instruction steps
- `cookingTime` - Time in minutes
- `difficultyLevel` - easy/medium/hard
- `dietaryTags` - Array of dietary tags

### User Ingredients Table
- `userId` (PK) - User identifier
- `ingredientId` (SK) - Ingredient identifier
- `name` - Ingredient name
- `quantity` - Amount
- `unit` - Measurement unit
- `expiryDate` - Optional expiry date

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

## 📊 Data Sources

- **Spoonacular API** - High-quality recipe data
- **Demo Data** - Curated recipes for development
- **User-Generated** - Future user-contributed recipes

## 🚀 Deployment

The application is deployed on AWS using CDK:

1. **API Gateway** - REST API endpoints
2. **Lambda Functions** - Serverless compute
3. **DynamoDB** - NoSQL database
4. **S3** - Static frontend hosting (future)

## 🧪 Development Scripts

### Backend
- `npm run build` - Build TypeScript
- `npm run watch` - Watch mode for development
- `npm run cdk deploy` - Deploy infrastructure
- `npm run import-recipes` - Import recipe data

### Frontend
- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run preview` - Preview production build

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.
