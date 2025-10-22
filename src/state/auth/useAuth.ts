/**
 * Auth Hooks
 * Custom hooks for accessing auth state
 */

import { useContext } from "react";
import { AuthContext, AuthContextType } from "./AuthContext";

/**
 * Hook to access auth context
 * Throws error if used outside AuthProvider
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};

/**
 * Hook to check if user is authenticated
 */
export const useIsAuthenticated = (): boolean => {
  const { firebaseUser } = useAuth();
  return firebaseUser !== null;
};

/**
 * Hook to get current user profile
 */
export const useCurrentUser = () => {
  const { user, loading } = useAuth();
  return { user, loading };
};
