/**
 * Order Workflow
 * ==============
 *
 * Orchestrates the end-to-end flow of placing a customer order across
 * five repositories: inventory, payment, order, notification, and CRM.
 *
 * Steps:
 *   1. Reserve inventory         (CRITICAL — must succeed)
 *   2. Authorize payment         (CRITICAL — must succeed)
 *   3. Create the order record   (CRITICAL — depends on step 1's reservationId)
 *   4. Send confirmation email   (NON-CRITICAL — fire-and-forget)
 *   5. Update CRM                (NON-CRITICAL — fire-and-forget)
 *
 * Constraints & Behavior:
 *   - Step 3 must run AFTER step 1 (it needs the reservationId).
 *   - Steps 4 and 5 must NOT block the function's return value.
 *   - totalCents = quantity * unitPriceCents.
 *   - On any critical failure, the function must throw a meaningful error.
 *
 * Failure Handling:
 *   - Steps 1 and 2 may be executed sequentially or in parallel.
 *   - HOWEVER, if one succeeds and the other fails, the system must be left in a consistent state.
 *     For example:
 *       - If inventory is reserved but payment fails → reservation should be released.
 *       - If payment succeeds but inventory fails → payment should be refunded.
 *   - You should think carefully about ordering or compensation strategies to handle this.
 *
 * Inputs:
 *   - input: customerId, email, itemId, quantity, unitPriceCents
 *   - repos: the five repositories listed above
 *
 * Returns:
 *   { orderId, transactionId } on success.
 */

/* ============================================================================
 * CODE REVIEW TASK
 * ----------------------------------------------------------------------------
 * The implementation below works for the happy path but has several issues.
 *
 * Your task:
 *   - Identify problems in the implementation.
 *   - For each issue, explain:
 *       (a) what is wrong,
 *       (b) why it matters in production,
 *       (c) how you would fix it (pseudocode is sufficient).
 *
 * Scope:
 *   - You are NOT required to fully reimplement the function.
 *   - Focus on reasoning, correctness, and design — not syntax.
 *
 * Important Requirements:
 *   - Consider partial failure scenarios between steps 1 and 2.
 *     If one succeeds and the other fails, explain how the system should recover.
 *   - Errors from critical steps should clearly indicate WHICH step failed.
 *   - Non-critical steps (4 and 5) should not block execution, but must handle
 *     their errors appropriately (e.g., logging via `.catch`).
 *
 * Guidance (not exhaustive):
 *   - Is `Promise.allSettled` the right primitive when both steps must succeed?
 *   - How are errors propagated to the caller?
 *   - Do fire-and-forget calls actually handle failures?
 *   - What happens if steps 1 and 2 are run in parallel and one fails?
 *   - Is the system left in a consistent state?
 *
 * This list is NOT exhaustive — identify any additional issues you notice.
 *
 * What strong answers demonstrate:
 *   - Ability to reason about async flows and failure scenarios
 *   - Awareness of data consistency and compensation patterns
 *   - Clear, practical improvements (not just theoretical ideas)
 * ============================================================================
 */

interface IInventoryRepo {
  reserveItem(
    itemId: string,
    quantity: number,
  ): Promise<{ reservationId: string }>;

  // Optional (for discussion in fixes)
  releaseReservation?(reservationId: string): Promise<void>;
}

interface IOrderRepo {
  createOrder(input: {
    customerId: string;
    itemId: string;
    quantity: number;
    reservationId: string;
    totalCents: number;
  }): Promise<{ orderId: number }>;
}

interface IPaymentRepo {
  authorizePayment(input: {
    customerId: string;
    amountCents: number;
  }): Promise<{ transactionId: string }>;

  // Optional (for discussion in fixes)
  refundPayment?(transactionId: string): Promise<void>;
}

interface INotificationRepo {
  sendConfirmation(orderId: number, email: string): Promise<void>;
}

interface ICRMRepo {
  logEvent(customerId: string, event: string): Promise<void>;
}

// --- Candidate reviews this implementation ---

type OrderInput = {
  customerId: string;
  email: string;
  itemId: string;
  quantity: number;
  unitPriceCents: number;
};

type OrderResult = {
  orderId: number;
  transactionId: string;
};

async function executeOrderWorkflow(
  input: OrderInput,
  repos: {
    inventory: IInventoryRepo;
    order: IOrderRepo;
    payment: IPaymentRepo;
    notification: INotificationRepo;
    crm: ICRMRepo;
  },
): Promise<OrderResult> {
  const totalCents = input.quantity * input.unitPriceCents;

  // Attempt critical steps in parallel (steps 1 and 2)
  const [reservation, payment] = await Promise.all([
    repos.inventory.reserveItem(input.itemId, input.quantity),
    repos.payment.authorizePayment({
      customerId: input.customerId,
      amountCents: totalCents,
    }),
  ]);

    
  // Step 3 (depends on reservation)
  const order = await repos.order.createOrder({
    customerId: input.customerId,
    itemId: input.itemId,
    quantity: input.quantity,
    reservationId: reservation.reservationId,
    totalCents,
  });

  // Fire-and-forget (non-critical)
  repos.notification.sendConfirmation(order.orderId, input.email);
  repos.crm.logEvent(input.customerId, "order_created");

  return {
    orderId: order.orderId,
    transactionId: payment.transactionId,
  };
}
