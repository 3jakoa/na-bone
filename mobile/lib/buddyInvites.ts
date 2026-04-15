import AsyncStorage from "@react-native-async-storage/async-storage";

const PENDING_BUDDY_INVITE_TOKEN_KEY = "pending_buddy_invite_token";

export async function getPendingBuddyInviteToken() {
  return AsyncStorage.getItem(PENDING_BUDDY_INVITE_TOKEN_KEY);
}

export async function setPendingBuddyInviteToken(token: string) {
  await AsyncStorage.setItem(PENDING_BUDDY_INVITE_TOKEN_KEY, token);
}

export async function clearPendingBuddyInviteToken() {
  await AsyncStorage.removeItem(PENDING_BUDDY_INVITE_TOKEN_KEY);
}
