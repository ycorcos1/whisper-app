/**
 * Auth Screen
 * Email/password authentication with login/signup toggle
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { theme } from "../theme";
import {
  getKeyboardBehavior,
  getAuthKeyboardOffset,
} from "../lib/keyboardUtils";
import { useAuth } from "../state/auth/useAuth";
import type { AuthContextType } from "../state/auth/AuthContext";

export default function AuthScreen() {
  const { signup, login, loading, error, clearError } =
    useAuth() as AuthContextType;

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Show error as alert
  useEffect(() => {
    if (error) {
      Alert.alert("Error", error, [{ text: "OK", onPress: clearError }]);
    }
  }, [error, clearError]);

  const validateForm = (): string | null => {
    if (!email.trim()) {
      return "Please enter your email";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return "Please enter a valid email address";
    }

    if (!password) {
      return "Please enter your password";
    }

    if (password.length < 6) {
      return "Password must be at least 6 characters";
    }

    if (!isLogin) {
      if (!displayName.trim()) {
        return "Please enter your name";
      }
      if (displayName.trim().length < 2) {
        return "Name must be at least 2 characters";
      }
    }

    return null;
  };

  const handleSubmit = async () => {
    // Validate form
    const validationError = validateForm();
    if (validationError) {
      Alert.alert("Validation Error", validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      if (isLogin) {
        await login({ email: email.trim(), password });
      } else {
        await signup({
          email: email.trim(),
          password,
          displayName: displayName.trim(),
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    clearError();
  };

  const isFormDisabled = loading || isSubmitting;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={getKeyboardBehavior()}
      keyboardVerticalOffset={getAuthKeyboardOffset()}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.logo}>Whisper</Text>
            <Text style={styles.subtitle}>
              Secure messaging, beautifully simple
            </Text>
          </View>

          <View style={styles.form}>
            {!isLogin && (
              <View>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your name"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCapitalize="words"
                  autoComplete="name"
                  editable={!isFormDisabled}
                />
              </View>
            )}

            <View>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={theme.colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!isFormDisabled}
              />
            </View>

            <View>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="At least 6 characters"
                placeholderTextColor={theme.colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                editable={!isFormDisabled}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, isFormDisabled && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isFormDisabled}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>
                  {isLogin ? "Log In" : "Sign Up"}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toggleButton}
              onPress={toggleMode}
              disabled={isFormDisabled}
            >
              <Text style={styles.toggleText}>
                {isLogin
                  ? "Don't have an account? Sign up"
                  : "Already have an account? Log in"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By continuing, you agree to our Terms of Service and Privacy
              Policy
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing["2xl"],
  },
  header: {
    alignItems: "center",
    marginBottom: theme.spacing["2xl"],
  },
  logo: {
    fontSize: theme.typography.fontSize["4xl"],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.amethystGlow,
    textAlign: "center",
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  form: {
    gap: theme.spacing.lg,
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  button: {
    backgroundColor: theme.colors.amethystGlow,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: "center",
    marginTop: theme.spacing.sm,
    ...theme.shadows.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  toggleButton: {
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
  },
  toggleText: {
    color: theme.colors.lavenderHaze,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },
  footer: {
    marginTop: theme.spacing["2xl"],
    alignItems: "center",
  },
  footerText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
});
