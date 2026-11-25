import { MOBILE_ERROR_CODES } from '@nadohq/mobile-client';
import { subaccountToHex } from '@nadohq/shared';
import { before, describe, test } from 'node:test';
import { zeroAddress } from 'viem';
import { assertRejectsWithMobileErrorCode } from '../utils/assertRejectsWithMobileErrorCode';
import { getMobileSignedParams } from '../utils/getMobileSignedParams';
import { createTestContext } from '../utils/runWithContext';
import { TEST_TIMEOUTS } from '../utils/testConstants';
import { RunContext } from '../utils/types';

void describe(
  '[mobile-client]: submit tip admission',
  { timeout: TEST_TIMEOUTS.DEFAULT },
  () => {
    let tc: RunContext;

    before(() => {
      tc = createTestContext();
    });

    void test('rejects a malformed Tip submission without authorizing a withdrawal', async () => {
      const auth = getMobileSignedParams(tc);
      // The inner signature is deliberately empty: no withdrawal can pass owner verification or dispatch.
      // Several fields are invalid; this checks the released operation's admission failure without
      // assuming which validation branch rejects the request first.
      await assertRejectsWithMobileErrorCode(
        () =>
          tc.mobile.submitTip({
            ...auth,
            recipientSubaccount: {
              subaccountOwner: '0x2222222222222222222222222222222222222222',
              subaccountName: 'default',
            },
            backgroundId: 'sdk-validation-only',
            visibility: 'private',
            withdrawal: {
              sender: subaccountToHex(auth),
              productId: 0,
              amount: '5000000',
              nonce: '0',
              sendTo: zeroAddress,
              appendix: '0',
            },
            withdrawalSignature: '0x',
            maxFeeX18: '0',
          }),
        MOBILE_ERROR_CODES.INVALID_TIP_REQUEST,
        'execute_submit_tip',
      );
    });
  },
);
