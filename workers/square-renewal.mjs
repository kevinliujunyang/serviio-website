import { Store } from '../server/account/store.mjs';
import { runRenewal } from '../server/account/renewal.mjs';

export default {
  async scheduled(_controller, env, context) {
    context.waitUntil(runRenewal(env, new Store(env.ACCOUNT_DB), Date.now()).then(result => {
      // Counts contain no merchant identifiers, credentials, or provider payloads.
      console.info('Square renewal batch', JSON.stringify(result));
    }));
  },
};
