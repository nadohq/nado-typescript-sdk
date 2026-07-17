import { MobileIdentity, MobilePublicProfile } from './types/clientTypes';
import { MobileServerIdentity, MobileServerProfile } from './types/serverTypes';

/**
 * Maps a server-side identity (snake_case) to its client-side (camelCase) representation.
 */
export function mapMobileIdentity(
  server: MobileServerIdentity,
): MobileIdentity {
  return {
    subaccount: server.subaccount,
    username: server.username,
    displayName: server.display_name,
    privateMode: server.private_mode,
  };
}

/**
 * Maps a server-side public profile (snake_case) to its client-side (camelCase) representation.
 */
export function mapMobilePublicProfile(
  server: MobileServerProfile,
): MobilePublicProfile {
  return {
    subaccount: server.subaccount,
    username: server.username,
    displayName: server.display_name,
  };
}
