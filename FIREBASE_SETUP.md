# Firebase Configuration

Create a `.env.local` file in the `apps/web` directory with the following Firebase credentials from your Firebase project:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

And in the `apps/server/.env` file, add:

```
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY="your_private_key_with_newlines_as_\\n"
FIREBASE_CLIENT_EMAIL=your_service_account_email
```

## Setup Instructions

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project or use an existing one
3. Enable Firebase Authentication:
   - Go to Authentication > Sign-in method
   - Enable "Email/Password" provider
4. Enable Firestore Database
5. Get your credentials:
   - For the web app: Go to Project settings > General > Your apps > Click on your web app
   - For the server: Go to Project settings > Service accounts > Generate a new private key

## Features

- User registration with email and password
- User login and logout
- Protected routes that require authentication
- Account storage in Firebase Authentication
- Room creation and joining restricted to authenticated users
- Rooms track which user created them
