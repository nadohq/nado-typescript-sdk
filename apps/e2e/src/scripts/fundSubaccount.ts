import { ensureSubaccountFunded } from '../utils/ensureSubaccountFunded';
import { createTestContext } from '../utils/runWithContext';

const context = createTestContext();
await ensureSubaccountFunded(context);

console.log('Subaccount funded successfully.');
