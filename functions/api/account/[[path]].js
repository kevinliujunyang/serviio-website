import { handleAccount } from '../../../server/account/router.mjs';

export function onRequest(context) {
  return handleAccount(context.request, context.env);
}
