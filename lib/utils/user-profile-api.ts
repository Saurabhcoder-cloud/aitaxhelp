import { UserProfile, TaxProfile } from "@/types/supabase";
import { UpdateProfileRequestInput } from "@/lib/validations/user-profile";
import { getClientAuthHeaders } from "./calculation-history-api";

export interface ProfileApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface UserProfileBundle {
  profile: UserProfile;
  taxProfile: TaxProfile;
}

/**
 * Fetches the user profile and tax profile for the authenticated session.
 */
export async function fetchUserProfile(): Promise<ProfileApiResponse<UserProfileBundle>> {
  try {
    const res = await fetch("/api/v1/auth/profile", {
      method: "GET",
      headers: getClientAuthHeaders(),
      cache: "no-store",
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      return {
        success: false,
        error: json.error?.message || "Failed to load user profile.",
      };
    }

    return {
      success: true,
      data: json.data as UserProfileBundle,
    };
  } catch (_err) {
    return {
      success: false,
      error: "Network error occurred while fetching user profile.",
    };
  }
}

/**
 * Updates the user profile and/or taxpayer preferences.
 */
export async function updateUserProfile(
  payload: UpdateProfileRequestInput
): Promise<ProfileApiResponse<UserProfileBundle>> {
  try {
    const res = await fetch("/api/v1/auth/profile", {
      method: "PATCH",
      headers: getClientAuthHeaders(),
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      return {
        success: false,
        error: json.error?.message || "Failed to update profile.",
      };
    }

    return {
      success: true,
      data: json.data as UserProfileBundle,
    };
  } catch (_err) {
    return {
      success: false,
      error: "Network error occurred while saving profile changes.",
    };
  }
}
