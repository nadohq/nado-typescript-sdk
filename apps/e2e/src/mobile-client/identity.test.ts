import {
  MOBILE_DISPLAY_NAME_PATTERN,
  MOBILE_ERROR_CODES,
  MobileAvatarSelection,
  MobilePublicProfile,
} from '@nadohq/mobile-client';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, describe, test } from 'node:test';
import { assertRejectsWithMobileErrorCode } from '../utils/assertRejectsWithMobileErrorCode';
import {
  assertBoolean,
  assertDefined,
  assertNonNegativeInteger,
  assertNullableString,
  assertString,
} from '../utils/assertions';
import { debugPrint } from '../utils/debugPrint';
import { delay } from '../utils/delay';
import { getMobileSignedParams } from '../utils/getMobileSignedParams';
import { createTestContext } from '../utils/runWithContext';
import {
  TEST_DELAYS,
  TEST_SECONDARY_SUBACCOUNT_NAME,
  TEST_SUBACCOUNT_NAME,
  TEST_TIMEOUTS,
} from '../utils/testConstants';
import { RunContext } from '../utils/types';

void describe(
  '[mobile-client]: identity',
  { timeout: TEST_TIMEOUTS.LONG },
  () => {
    let tc: RunContext;

    before(async () => {
      await delay(TEST_DELAYS.LONG);
      tc = createTestContext();
    });

    void test('reports availability for a well-formed display name', async () => {
      const displayName = `Probe${Date.now()}`;
      assert.match(
        displayName,
        MOBILE_DISPLAY_NAME_PATTERN,
        'test display name should satisfy the 3-20 char display name rules',
      );
      const result = await tc.mobile.getUsernameAvailability({ displayName });
      debugPrint('Username availability result', result);

      assertDefined(result, 'availabilityResult');
      assertString(result.username, 'availabilityResult.username');
      assertBoolean(result.available, 'availabilityResult.available');
    });

    void test('rejects a malformed display name with INVALID_DISPLAY_NAME', async () => {
      await assertRejectsWithMobileErrorCode(
        () => tc.mobile.getUsernameAvailability({ displayName: '!!' }),
        MOBILE_ERROR_CODES.INVALID_DISPLAY_NAME,
      );
    });

    void test('returns the avatar catalogue with unique IDs and image URLs', async () => {
      const presets = await tc.mobile.getAvatarPresets();
      assert.ok(Array.isArray(presets), 'presets should be an array');
      assert.equal(new Set(presets.map(({ id }) => id)).size, presets.length);
      for (const preset of presets) {
        assertString(preset.id, 'preset.id');
        assert.equal(new URL(preset.avatarUrl).protocol, 'https:');
      }
    });

    void test('sets and clears the bio, then restores the original', async () => {
      const params = getMobileSignedParams(tc);
      const { bio: originalBio } = await getTestSubaccountProfile(tc);
      assertNullableString(originalBio, 'originalBio');
      const bio = 'SDK E2E 中文 🚀\nProfile biography';

      try {
        await tc.mobile.setBio({ ...params, bio });
        await delay(TEST_DELAYS.STANDARD);
        assert.equal((await getTestSubaccountProfile(tc)).bio, bio);

        await tc.mobile.setBio({ ...params, bio: ' \n ' });
        await delay(TEST_DELAYS.STANDARD);
        assert.equal((await getTestSubaccountProfile(tc)).bio, null);
      } finally {
        await tc.mobile.setBio({ ...params, bio: originalBio ?? '' });
        await delay(TEST_DELAYS.STANDARD);
        assert.equal((await getTestSubaccountProfile(tc)).bio, originalBio);
      }
    });

    void test('rejects an overlong bio with INVALID_BIO', async () => {
      await assertRejectsWithMobileErrorCode(
        () =>
          tc.mobile.setBio({
            ...getMobileSignedParams(tc),
            bio: 'a'.repeat(151),
          }),
        MOBILE_ERROR_CODES.INVALID_BIO,
      );
    });

    void test('rejects an empty avatar upload with INVALID_AVATAR', async () => {
      await assertRejectsWithMobileErrorCode(
        () =>
          tc.mobile.createAvatarUpload({
            ...getMobileSignedParams(tc),
            contentLength: 0,
          }),
        MOBILE_ERROR_CODES.INVALID_AVATAR,
      );
    });

    void test('rejects an unknown avatar preset with INVALID_AVATAR', async () => {
      await assertRejectsWithMobileErrorCode(
        () =>
          tc.mobile.setAvatar({
            ...getMobileSignedParams(tc),
            avatar: { type: 'preset', id: '__sdk_e2e_invalid_preset__' },
          }),
        MOBILE_ERROR_CODES.INVALID_AVATAR,
      );
    });

    void test('sets preset and uploaded avatars, clears and restores the original', async (context) => {
      const params = getMobileSignedParams(tc);
      const { avatarUrl: originalUrl } = await getTestSubaccountProfile(tc);
      assertNullableString(originalUrl, 'originalAvatarUrl');
      const presets = await tc.mobile.getAvatarPresets();
      const originalPreset = presets.find(
        ({ avatarUrl }) => avatarUrl === originalUrl,
      );
      // A published photo cannot be selected again by URL; only a staging key or a current preset is accepted.
      if (originalUrl !== null && !originalPreset) {
        context.skip(
          'The saved photo or retired preset cannot be restored through setAvatar.',
        );
        return;
      }
      const originalAvatar: MobileAvatarSelection | null = originalPreset
        ? { type: 'preset', id: originalPreset.id }
        : null;
      const preset =
        presets.find(({ avatarUrl }) => avatarUrl !== originalUrl) ??
        presets[0];
      assertDefined(preset, 'available avatar preset');
      const image = new Uint8Array(
        await readFile(new URL('./fixtures/avatar.jpg', import.meta.url)),
      );

      try {
        await tc.mobile.setAvatar({
          ...params,
          avatar: { type: 'preset', id: preset.id },
        });
        await delay(TEST_DELAYS.STANDARD);
        assert.equal(
          (await getTestSubaccountProfile(tc)).avatarUrl,
          preset.avatarUrl,
        );

        const grant = await tc.mobile.createAvatarUpload({
          ...params,
          contentLength: image.byteLength,
        });
        assertString(grant.uploadKey, 'upload.uploadKey');
        assert.equal(new URL(grant.uploadUrl).protocol, 'https:');
        assertNonNegativeInteger(
          grant.expiresInSeconds,
          'upload.expiresInSeconds',
        );
        assert.ok(grant.expiresInSeconds > 0);
        assert.equal(grant.headers['content-type'], 'image/jpeg');
        const upload = await fetch(grant.uploadUrl, {
          method: 'PUT',
          headers: grant.headers,
          body: image,
          signal: AbortSignal.timeout(TEST_TIMEOUTS.DEFAULT),
        });
        assert.ok(upload.ok, `Avatar upload failed with HTTP ${upload.status}`);

        await tc.mobile.setAvatar({
          ...params,
          avatar: { type: 'upload', uploadKey: grant.uploadKey },
        });
        await delay(TEST_DELAYS.STANDARD);
        const { avatarUrl } = await getTestSubaccountProfile(tc);
        assertDefined(avatarUrl, 'publishedAvatarUrl');
        assertString(avatarUrl, 'publishedAvatarUrl');
        assert.notEqual(avatarUrl, preset.avatarUrl);
        const published = await fetch(avatarUrl, {
          signal: AbortSignal.timeout(TEST_TIMEOUTS.DEFAULT),
        });
        assert.ok(
          published.ok,
          `Published avatar failed to load with HTTP ${published.status}`,
        );
        assert.equal(published.headers.get('content-type'), 'image/jpeg');
        assert.ok((await published.arrayBuffer()).byteLength > 0);

        await tc.mobile.setAvatar({ ...params, avatar: null });
        await delay(TEST_DELAYS.STANDARD);
        assert.equal((await getTestSubaccountProfile(tc)).avatarUrl, null);
      } finally {
        await tc.mobile.setAvatar({ ...params, avatar: originalAvatar });
        await delay(TEST_DELAYS.STANDARD);
        assert.equal(
          (await getTestSubaccountProfile(tc)).avatarUrl,
          originalUrl,
        );
      }
    });

    // setUsername upserts, so one test covers both claiming a first username and renaming an existing one:
    // whichever state the shared test subaccount is already in, the same call applies.
    void test('sets the display name and restores any original', async () => {
      const identityParams = getMobileSignedParams(tc);

      const identity = await getTestSubaccountProfile(tc);
      const originalDisplayName = identity.displayName;
      debugPrint('Identity before set', identity);

      const newDisplayName = `E2E_${Date.now()}`;
      assert.match(newDisplayName, MOBILE_DISPLAY_NAME_PATTERN);

      await tc.mobile.setUsername({
        ...identityParams,
        displayName: newDisplayName,
      });
      await delay(TEST_DELAYS.STANDARD);

      const updatedIdentity = await getTestSubaccountProfile(tc);
      debugPrint('Identity after set', updatedIdentity);
      assert.equal(updatedIdentity.displayName, newDisplayName);
      assert.equal(updatedIdentity.username, newDisplayName.toLowerCase());

      if (originalDisplayName === null) {
        // A username cannot be released once claimed, so there is nothing to restore on a first claim.
        return;
      }

      await tc.mobile.setUsername({
        ...identityParams,
        displayName: originalDisplayName,
      });
      await delay(TEST_DELAYS.STANDARD);

      const restoredIdentity = await getTestSubaccountProfile(tc);
      debugPrint('Identity after restore', restoredIdentity);
      assert.equal(restoredIdentity.displayName, originalDisplayName);
    });

    void test('rejects a name held by another subaccount with USERNAME_UNAVAILABLE', async () => {
      const identityParams = getMobileSignedParams(tc);

      const identity = await getTestSubaccountProfile(tc);
      const { displayName } = identity;

      if (displayName === null) {
        // No claimed name on this environment yet, so there is nothing to collide with.
        return;
      }

      // Usernames are unique across all identities, so a second subaccount of the same owner cannot take a
      // name the default subaccount already holds. Signing still works because the owner is unchanged.
      await assertRejectsWithMobileErrorCode(
        () =>
          tc.mobile.setUsername({
            ...identityParams,
            subaccountName: TEST_SECONDARY_SUBACCOUNT_NAME,
            displayName,
          }),
        MOBILE_ERROR_CODES.USERNAME_UNAVAILABLE,
      );
    });

    // Private Mode works before a username is claimed, so this needs no claimed-identity branch.
    void test('toggles private mode and restores the original value', async () => {
      const identityParams = getMobileSignedParams(tc);

      const identity = await getTestSubaccountProfile(tc);

      const originalPrivateMode = identity.privateMode;

      await tc.mobile.setPrivateMode({
        ...identityParams,
        privateMode: !originalPrivateMode,
      });
      await delay(TEST_DELAYS.STANDARD);

      const toggledIdentity = await getTestSubaccountProfile(tc);
      debugPrint('Identity after private mode toggle', toggledIdentity);
      assert.equal(toggledIdentity.privateMode, !originalPrivateMode);

      await tc.mobile.setPrivateMode({
        ...identityParams,
        privateMode: originalPrivateMode,
      });
      await delay(TEST_DELAYS.STANDARD);

      const restoredIdentity = await getTestSubaccountProfile(tc);
      debugPrint('Identity after private mode restore', restoredIdentity);
      assert.equal(restoredIdentity.privateMode, originalPrivateMode);
    });
  },
);

/**
 * Reads the shared test subaccount's profile to verify what an identity write landed. Profiles are only
 * readable in batches, so this asks for a single slot and unwraps it; profiles.test.ts covers the batching
 * and the includes themselves.
 */
async function getTestSubaccountProfile(
  tc: RunContext,
): Promise<MobilePublicProfile> {
  const [profile] = await tc.mobile.getProfiles({
    subaccounts: [
      {
        subaccountOwner: tc.walletClientAddress,
        subaccountName: TEST_SUBACCOUNT_NAME,
      },
    ],
  });
  assertDefined(profile, 'profile');
  return profile;
}
