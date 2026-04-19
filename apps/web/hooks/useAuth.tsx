"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db, isFirebaseEnabled } from "../lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

interface UserProfile {
  name: string;
  preferredLanguage: string;
  email: string;
  createdAt: Date;
  voiceSampleRecorded: boolean;
  voiceSampleUrl?: string;
  voiceSampleDuration?: number;
  voiceCloneReady: boolean;
  voiceCloneId?: string;
  voiceCloneProvider?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signup: (email: string, password: string, name: string, language: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isFirebaseEnabled: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseEnabled || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser && db) {
        // Fetch user profile from Firestore
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setProfile({
              name: data.name,
              preferredLanguage: data.preferredLanguage,
              email: data.email,
              createdAt: data.createdAt.toDate(),
              voiceSampleRecorded: data.voiceSampleRecorded ?? false,
              voiceSampleUrl: data.voiceSampleUrl,
              voiceSampleDuration: data.voiceSampleDuration,
              voiceCloneReady: data.voiceCloneReady ?? false,
              voiceCloneId: data.voiceCloneId,
              voiceCloneProvider: data.voiceCloneProvider,
            });
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signup = async (email: string, password: string, name: string, language: string) => {
    if (!isFirebaseEnabled || !auth) {
      throw new Error("Firebase authentication is not configured");
    }
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Store additional user information in Firestore
    if (db) {
      const userProfile = {
        name,
        preferredLanguage: language,
        email: user.email!,
        createdAt: new Date(),
        voiceSampleRecorded: false,
        voiceCloneReady: false,
      };
      await setDoc(doc(db, "users", user.uid), userProfile);
      setProfile(userProfile);
    }

    setUser(user);
  };

  const login = async (email: string, password: string) => {
    if (!isFirebaseEnabled || !auth) {
      throw new Error("Firebase authentication is not configured");
    }
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    setUser(userCredential.user);
  };

  const refreshProfile = async () => {
    const currentUser = auth?.currentUser;
    if (!currentUser || !db) return;
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      setProfile({
        name: data.name,
        preferredLanguage: data.preferredLanguage,
        email: data.email,
        createdAt: data.createdAt.toDate(),
        voiceSampleRecorded: data.voiceSampleRecorded ?? false,
        voiceSampleUrl: data.voiceSampleUrl,
        voiceSampleDuration: data.voiceSampleDuration,
        voiceCloneReady: data.voiceCloneReady ?? false,
        voiceCloneId: data.voiceCloneId,
        voiceCloneProvider: data.voiceCloneProvider,
      });
    }
  };

  const logout = async () => {
    if (!isFirebaseEnabled || !auth) {
      setUser(null);
      setProfile(null);
      return;
    }
    await signOut(auth);
    setUser(null);
    setProfile(null);
  };

  const value = {
    user,
    profile,
    loading,
    signup,
    login,
    logout,
    refreshProfile,
    isFirebaseEnabled
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
