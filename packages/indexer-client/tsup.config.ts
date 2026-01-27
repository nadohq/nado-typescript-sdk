import baseConfig from '../../tsup.base.config';
import { withPeerDepsExternal } from '../../tsup.utils';

export default withPeerDepsExternal(import.meta.url, baseConfig);
