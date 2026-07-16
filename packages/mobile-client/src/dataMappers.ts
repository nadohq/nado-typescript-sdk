import { Identity, PublicProfile } from './types/clientTypes';
import { MobileServerIdentity, MobileServerProfile } from './types/serverTypes';

/**
 * Maps a server-side identity (snake_case) to its client-side (camelCase) representation.
 */
export function mapMobileIdentity(server: MobileServerIdentity): Identity {
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
): PublicProfile {
  return {
    subaccount: server.subaccount,
    username: server.username,
    displayName: server.display_name,
  };
}
