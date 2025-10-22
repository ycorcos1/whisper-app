/**
 * Navigation Types
 * Type-safe navigation parameters for all screens
 */

import { NavigatorScreenParams } from "@react-navigation/native";

export type RootStackParamList = {
  Auth: undefined;
  Home: NavigatorScreenParams<HomeTabsParamList>;
  Chat: { conversationId: string; conversationName: string };
  ChatSettings: { conversationId: string };
  NewChat: undefined;
};

export type HomeTabsParamList = {
  Conversations: undefined;
  Profile: undefined;
};

declare global {
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
