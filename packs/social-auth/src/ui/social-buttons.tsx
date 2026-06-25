import { View, Platform } from 'react-native';

import { Button } from '@/shared/ui';

import { useAppleSignIn, useGoogleSignIn, type SocialAuthResult } from '../use-social-auth';

/**
 * DESIGN: replace after Claude Design. Minimal Apple + Google sign-in buttons that
 * prove the native-credential → backend-seam flow end to end. Token-driven (shared
 * Button primitive, NativeWind classNames) — no hardcoded hex, no brand chrome yet.
 */
export function SocialButtons({ onResult }: { onResult?: (result: SocialAuthResult) => void }) {
  const apple = useAppleSignIn();
  const google = useGoogleSignIn();

  return (
    <View className="gap-3">
      {/* Apple sign-in is iOS-only (App Store also requires it when other social logins exist). */}
      {Platform.OS === 'ios' ? (
        <Button
          testID="social-auth-apple"
          label="Continue with Apple"
          variant="secondary"
          loading={apple.busy}
          onPress={() => void apple.signIn().then((r) => onResult?.(r))}
        />
      ) : null}
      <Button
        testID="social-auth-google"
        label="Continue with Google"
        variant="secondary"
        loading={google.busy}
        onPress={() => void google.signIn().then((r) => onResult?.(r))}
      />
    </View>
  );
}
